import {describe, expect, it} from "vitest";
import fc from "fast-check";

import {reconcile} from "../../src/graphics/cards/model/Reconcile";
import {boardRecipeArb, buildBoard, serverFromBoard} from "./support/Generators";
import {checkBoardInvariants, checkServerAgreement} from "./support/Invariants";
import {applyMutations, freshIds, mutationsArb, ServerState} from "./support/ServerMutations";
import {fragmentCardIds, handIds, snapshot, worldPosition} from "./support/Snapshot";

/**
 * Reconcile is specified by its invariants, not by examples: the combinations of board state and
 * incoming server state are far too many to enumerate. Each property below throws hundreds of
 * random boards and plausible server transitions at it.
 */

const RUNS = 300;

/** A board plus the server state it is currently in agreement with, then moved on by mutations. */
function scenario(recipe: Parameters<typeof buildBoard>[0], mutations: Parameters<typeof applyMutations>[1]) {
    const board = buildBoard(recipe);
    const server: ServerState = serverFromBoard(board);

    applyMutations(server, mutations, freshIds());

    return {board, server};
}

describe("reconcile agrees with the server", () => {
    it("leaves the board well-formed", () => {
        fc.assert(
            fc.property(boardRecipeArb, mutationsArb, (recipe, mutations) => {
                const {board, server} = scenario(recipe, mutations);

                reconcile(board, server.player, server.otherPlayers);

                expect(checkBoardInvariants(board)).toEqual([]);
            }),
            {numRuns: RUNS}
        );
    });

    it("makes the board agree with the incoming state", () => {
        fc.assert(
            fc.property(boardRecipeArb, mutationsArb, (recipe, mutations) => {
                const {board, server} = scenario(recipe, mutations);

                reconcile(board, server.player, server.otherPlayers);

                expect(checkServerAgreement(board, server.player, server.otherPlayers)).toEqual([]);
            }),
            {numRuns: RUNS}
        );
    });

    it("agrees even when the player is mid-rebuild", () => {
        fc.assert(
            fc.property(boardRecipeArb, mutationsArb, (recipe, mutations) => {
                const {board, server} = scenario({...recipe, canRebuild: true}, mutations);

                reconcile(board, server.player, server.otherPlayers);

                expect(checkBoardInvariants(board)).toEqual([]);
                expect(checkServerAgreement(board, server.player, server.otherPlayers)).toEqual([]);
            }),
            {numRuns: RUNS}
        );
    });
});

describe("reconcile is well-behaved as a function", () => {
    it("is idempotent — reconciling the same state twice changes nothing", () => {
        fc.assert(
            fc.property(boardRecipeArb, mutationsArb, (recipe, mutations) => {
                const {board, server} = scenario(recipe, mutations);

                reconcile(board, server.player, server.otherPlayers);
                const once = snapshot(board);

                reconcile(board, server.player, server.otherPlayers);
                const twice = snapshot(board);

                expect(twice).toEqual(once);
            }),
            {numRuns: RUNS}
        );
    });

    it("is deterministic — same inputs, same board", () => {
        fc.assert(
            fc.property(boardRecipeArb, mutationsArb, (recipe, mutations) => {
                const first = scenario(recipe, mutations);
                const second = scenario(recipe, mutations);

                reconcile(first.board, first.server.player, first.server.otherPlayers);
                reconcile(second.board, second.server.player, second.server.otherPlayers);

                expect(snapshot(second.board)).toEqual(snapshot(first.board));
            }),
            {numRuns: RUNS}
        );
    });
});

describe("reconcile preserves the player's arrangement", () => {
    it("keeps the relative order of hand cards that stayed in hand", () => {
        fc.assert(
            fc.property(boardRecipeArb, mutationsArb, (recipe, mutations) => {
                const {board, server} = scenario(recipe, mutations);

                const before = handIds(board);

                reconcile(board, server.player, server.otherPlayers);

                const after = handIds(board);
                const survivors = before.filter(id => after.includes(id));

                // cards may be removed or appended, but the ones that stayed must not be shuffled
                expect(after.filter(id => survivors.includes(id))).toEqual(survivors);
            }),
            {numRuns: RUNS}
        );
    });

    it("does not move a fragment card that is still in a fragment", () => {
        fc.assert(
            fc.property(boardRecipeArb, mutationsArb, (recipe, mutations) => {
                const {board, server} = scenario(recipe, mutations);

                const before = new Map(
                    fragmentCardIds(board).map(id => [id, worldPosition(board, id)!])
                );

                reconcile(board, server.player, server.otherPlayers);

                for (const id of fragmentCardIds(board)) {
                    const was = before.get(id);

                    if (was === undefined) {
                        continue;
                    }

                    // a fragment may split, so the chunk id can change — but the card must not move
                    expect(worldPosition(board, id)).toEqual(was);
                }
            }),
            {numRuns: RUNS}
        );
    });

    it("does not move chunks that survive", () => {
        fc.assert(
            fc.property(boardRecipeArb, mutationsArb, (recipe, mutations) => {
                const {board, server} = scenario(recipe, mutations);

                const before = new Map(board.getChunks().map(c => [c.id, {...c.position}]));

                reconcile(board, server.player, server.otherPlayers);

                for (const chunk of board.getChunks()) {
                    const was = before.get(chunk.id);

                    if (was !== undefined) {
                        expect(chunk.position).toEqual(was);
                    }
                }
            }),
            {numRuns: RUNS}
        );
    });
});

describe("reconcile handles the cases that used to be broken", () => {
    it("refreshes the health of a damaged module", () => {
        const board = buildBoard({
            localShip: {steps: [{variant: 0, slot: 0, rotation: 0}, {variant: 1, slot: 0, rotation: 0}], position: {x: 0, y: 0}},
            fragments: [],
            handModules: [],
            handEvents: 0,
            otherShips: [{steps: [{variant: 2, slot: 0, rotation: 0}], position: {x: 10, y: 0}}],
            canRebuild: false,
            mainModuleChoice: 0
        });

        const server = serverFromBoard(board);
        const damaged = server.player.spaceship.modules[0];
        damaged.health -= 3;

        reconcile(board, server.player, server.otherPlayers);

        // the defect this replaces: the board updated its data but the card kept its old health,
        // so a damaged module never changed colour
        expect(board.getCard(damaged.id)!.card).toMatchObject({
            module: {id: damaged.id, health: damaged.health}
        });
        expect(checkServerAgreement(board, server.player, server.otherPlayers)).toEqual([]);
    });

    it("puts a newly drawn module in hand, not on the ship", () => {
        const board = buildBoard({
            localShip: {steps: [{variant: 0, slot: 0, rotation: 0}], position: {x: 0, y: 0}},
            fragments: [],
            handModules: [],
            handEvents: 0,
            otherShips: [{steps: [{variant: 1, slot: 0, rotation: 0}], position: {x: 10, y: 0}}],
            canRebuild: false,
            mainModuleChoice: 0
        });

        const server = serverFromBoard(board);
        applyMutations(server, [{kind: "drawModule", pick: 3}], freshIds());

        reconcile(board, server.player, server.otherPlayers);

        const drawn = server.player.hand[server.player.hand.length - 1];
        expect(handIds(board)).toContain(drawn.cardType === "module" ? drawn.module.id : -1);
    });
});
