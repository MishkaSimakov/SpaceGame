import {describe, expect, it} from "vitest";
import fc from "fast-check";

import {CardGetters} from "@common/getters/Card";

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

/**
 * Everything above asserts that agreement holds *after* reconcile. That is only meaningful if the
 * board genuinely disagreed *before* it — otherwise a mutation that quietly did nothing would let
 * every property pass for the wrong reason. These tests pin the disagreement down.
 */
describe("the board disagrees with the server before reconcile", () => {
    /** Cards the server holds, by id, zone and health — enough to tell a real change from a no-op. */
    function fingerprint(server: ServerState): string[] {
        return [
            ...server.player.hand.map(card => `${CardGetters.id(card)}:hand`),
            ...server.player.spaceship.modules.map(m => `${m.id}:ship:${m.health}`),
            ...server.otherPlayers.flatMap(p => p.spaceship.modules.map(m => `${m.id}:${p.id}:${m.health}`))
        ].sort();
    }

    it("reports a violation whenever the incoming state actually moved on", () => {
        fc.assert(
            fc.property(boardRecipeArb, mutationsArb, (recipe, mutations) => {
                const board = buildBoard({...recipe, canRebuild: false});

                const pristine: ServerState = serverFromBoard(board);
                const server: ServerState = serverFromBoard(board);
                applyMutations(server, mutations, freshIds());

                // a mutation that changed nothing proves nothing
                fc.pre(fingerprint(pristine).join() !== fingerprint(server).join());

                expect(checkServerAgreement(board, server.player, server.otherPlayers)).not.toEqual([]);
            }),
            {numRuns: RUNS}
        );
    });

    const FIXTURE = {
        localShip: {steps: [{variant: 0, slot: 0, rotation: 0}, {variant: 1, slot: 0, rotation: 0}], position: {x: 0, y: 0}},
        fragments: [],
        handModules: [{variant: 2, slot: 0, rotation: 0}],
        handEvents: 1,
        otherShips: [{steps: [{variant: 3, slot: 0, rotation: 0}, {variant: 4, slot: 0, rotation: 0}], position: {x: 10, y: 0}}],
        canRebuild: false,
        mainModuleChoice: 0
    };

    /** Mutates the server, asserts the board now disagrees in the named way, then heals it. */
    function expectDisagreementThenHealed(mutate: (server: ServerState) => void, pattern: RegExp) {
        const board = buildBoard(FIXTURE);
        const server: ServerState = serverFromBoard(board);

        expect(checkServerAgreement(board, server.player, server.otherPlayers)).toEqual([]);

        mutate(server);

        expect(checkServerAgreement(board, server.player, server.otherPlayers).join()).toMatch(pattern);

        reconcile(board, server.player, server.otherPlayers);

        expect(checkServerAgreement(board, server.player, server.otherPlayers)).toEqual([]);
        expect(checkBoardInvariants(board)).toEqual([]);
    }

    it("a damaged module: stale health, then refreshed", () => {
        expectDisagreementThenHealed(
            server => applyMutations(server, [{kind: "damage", pick: 0}], freshIds()),
            /has stale data/
        );
    });

    it("a destroyed module: still on the board, then removed", () => {
        expectDisagreementThenHealed(
            server => applyMutations(server, [{kind: "destroyLocalModule", pick: 0}], freshIds()),
            /on the board but not in the server state/
        );
    });

    it("a drawn card: missing from the board, then added", () => {
        expectDisagreementThenHealed(
            server => applyMutations(server, [{kind: "drawModule", pick: 0}], freshIds()),
            /in the server state but not on the board/
        );
    });

    it("a module knocked off the ship: still on the ship, then in hand", () => {
        expectDisagreementThenHealed(
            server => applyMutations(server, [{kind: "shipModuleToHand", pick: 0}], freshIds()),
            /main chunk .* != server ship/
        );
    });

    it("an opponent losing a module: still on their field, then gone", () => {
        expectDisagreementThenHealed(
            server => applyMutations(server, [{kind: "destroyOpponentModule", pick: 0, opponent: 0}], freshIds()),
            /on the board but not in the server state/
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
