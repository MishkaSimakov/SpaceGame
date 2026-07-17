import {describe, expect, it} from "vitest";
import fc from "fast-check";

import {CardGetters} from "@common/getters/Card";

import {Board} from "../../src/graphics/cards/model/Board";
import {reconcile} from "../../src/graphics/cards/model/Reconcile";
import {Command, commandsArb, runCommand} from "./support/Commands";
import {boardRecipeArb, buildBoard, serverFromBoard} from "./support/Generators";
import {checkBoardInvariants, checkServerAgreement} from "./support/Invariants";
import {freshIds, ServerState} from "./support/ServerMutations";
import {handIds} from "./support/Snapshot";

/**
 * Single reconciles are the easy case. The states that actually break a client are reached by
 * *sequences*: the player rearranges their ship, a state update lands, they drag a fragment onto it,
 * combat destroys the module they were building around, they commit a rebuild.
 *
 * These tests interleave what the player does with what the server says, and re-check the whole
 * specification after every single step, so a violation is caught at the step that caused it rather
 * than several steps later.
 */

function check(board: Board, server: ServerState, step: number, command: Command) {
    const where = `after step ${step} (${command.kind})`;

    expect(checkBoardInvariants(board), where).toEqual([]);
    expect(checkServerAgreement(board, server.player, server.otherPlayers), where).toEqual([]);

    // a drag is transient: no command may leave a card stranded outside hand and field
    const stranded = board.getCards().filter(info => info.location.type === "drag");
    expect(stranded.map(info => CardGetters.id(info.card)), `stranded ${where}`).toEqual([]);
}

describe("the board survives arbitrary sequences of play", () => {
    it("holds every invariant after every step", () => {
        fc.assert(
            fc.property(boardRecipeArb, commandsArb, (recipe, commands) => {
                const board = buildBoard(recipe);
                const server: ServerState = serverFromBoard(board);
                const ids = freshIds();

                check(board, server, 0, {kind: "startRebuild"});

                commands.forEach((command, index) => {
                    runCommand(board, server, command, ids);
                    check(board, server, index + 1, command);
                });
            }),
            {numRuns: 400}
        );
    });

    it("holds them for long sequences too", () => {
        fc.assert(
            fc.property(
                boardRecipeArb,
                fc.array(commandsArb, {minLength: 3, maxLength: 5}).map(cs => cs.flat()),
                (recipe, commands) => {
                    const board = buildBoard(recipe);
                    const server: ServerState = serverFromBoard(board);
                    const ids = freshIds();

                    commands.forEach((command, index) => {
                        runCommand(board, server, command, ids);
                        check(board, server, index + 1, command);
                    });
                }
            ),
            {numRuns: 100}
        );
    });
});

describe("the cases that are meant to be hard", () => {
    /**
     * Committing a rebuild is the moment the player's uncommitted edits stop winning and the server
     * takes over, so the failure to guard against is the next update quietly dragging a module the
     * player just detached back onto their ship.
     *
     * Stated over generated ships rather than one fixture, because how much the ship shrinks depends
     * on its shape: detaching a leaf loses one module, but detaching a module others were hanging off
     * cuts those loose too — and they correctly become a fragment, which is to say they land in the
     * hand. So the assertion is that the server's ship is *exactly the main chunk*, whatever that
     * turned out to be, rather than any particular count.
     */
    it("a rebuild the player commits becomes the ship the server holds", () => {
        fc.assert(
            fc.property(boardRecipeArb, recipe => {
                const board = buildBoard({...recipe, canRebuild: false});
                const server: ServerState = serverFromBoard(board);
                const ids = freshIds();

                const local = board.getThisPlayer();
                const shipBefore = new Set(server.player.spaceship.modules.map(m => m.id));

                runCommand(board, server, {kind: "startRebuild"}, ids);

                // detach from the ship specifically: the generic fieldToHand command would happily
                // pick a card out of a fragment instead, which is not the case under test
                const mainBefore = board.getMainChunk(local)!;
                const detachable = board.getChunkCards(mainBefore.id)
                    .filter(info => board.canDetachCard(CardGetters.id(info.card)));

                // some generated ships are the command module alone, with nothing to detach
                fc.pre(detachable.length > 0);

                const detached = CardGetters.id(detachable[0].card);
                expect(shipBefore.has(detached)).toBe(true);

                board.removeCardFromChunk(detached);
                board.pushToHand(detached);

                runCommand(board, server, {kind: "commitRebuild"}, ids);

                const mainChunk = board.getMainChunk(local);
                const mainIds = (mainChunk ? board.getChunkModules(mainChunk.id).map(m => m.id) : []).sort();
                const serverShip = server.player.spaceship.modules.map(m => m.id).sort();
                const serverHand = server.player.hand.map(CardGetters.id);

                // the submitted ship is the main chunk, no more and no less — this is the assertion
                // that holds whatever shape the ship happened to grow into
                expect(serverShip).toEqual(mainIds);
                expect(serverShip.length).toBeLessThan(shipBefore.size);

                // what came off is now a hand card as far as the game is concerned, and so is
                // anything that fell off with it — those became a fragment, which is the hand
                expect(serverHand).toContain(detached);
                expect(serverShip).not.toContain(detached);

                for (const id of shipBefore) {
                    if (!serverShip.includes(id)) {
                        expect(serverHand).toContain(id);
                    }
                }

                expect(checkServerAgreement(board, server.player, server.otherPlayers)).toEqual([]);

                // the next update must not put it back
                reconcile(board, server.player, server.otherPlayers);

                expect(checkBoardInvariants(board)).toEqual([]);
                expect(checkServerAgreement(board, server.player, server.otherPlayers)).toEqual([]);

                const mainAfter = board.getMainChunk(local);
                const mainIdsAfter = mainAfter ? board.getChunkModules(mainAfter.id).map(m => m.id) : [];

                expect(mainIdsAfter).not.toContain(detached);
            }),
            {numRuns: 300}
        );
    });

    it("an uncommitted rebuild survives an update landing mid-edit", () => {
        const board = buildBoard({
            localShip: {
                steps: [{variant: 0, slot: 0, rotation: 0}, {variant: 1, slot: 0, rotation: 0}],
                position: {x: 0, y: 0}
            },
            fragments: [],
            handModules: [],
            handEvents: 0,
            otherShips: [{steps: [{variant: 2, slot: 0, rotation: 0}], position: {x: 10, y: 0}}],
            canRebuild: false,
            mainModuleChoice: 0
        });

        const server = serverFromBoard(board);
        const ids = freshIds();

        runCommand(board, server, {kind: "startRebuild"}, ids);
        runCommand(board, server, {kind: "fieldToHand", pick: 0}, ids);

        const detached = handIds(board);
        expect(detached.length).toBe(1);

        // an opponent takes damage while we are still arranging: the update is stale with respect to
        // our uncommitted edit, and must not drag the module back onto the ship
        runCommand(board, server, {kind: "serverUpdate", mutations: [{kind: "damage", pick: 0}]}, ids);

        expect(handIds(board)).toEqual(detached);
        expect(checkBoardInvariants(board)).toEqual([]);
    });

    it("a fragment left on the field is still, to the server, in the hand", () => {
        const board = buildBoard({
            localShip: {steps: [{variant: 0, slot: 0, rotation: 0}], position: {x: 0, y: 0}},
            fragments: [],
            handModules: [{variant: 1, slot: 0, rotation: 0}, {variant: 2, slot: 0, rotation: 0}],
            handEvents: 0,
            otherShips: [{steps: [{variant: 3, slot: 0, rotation: 0}], position: {x: 10, y: 0}}],
            canRebuild: false,
            mainModuleChoice: 0
        });

        const server = serverFromBoard(board);
        const ids = freshIds();

        const handBefore = server.player.hand.length;

        // pre-assemble a hand card out on the field; the server's hand must not change
        runCommand(board, server, {kind: "handToField", pick: 0, x: 6, y: 6}, ids);

        expect(board.getHand().length).toBe(handBefore - 1);
        expect(checkServerAgreement(board, server.player, server.otherPlayers)).toEqual([]);

        // and it stays put when the next update arrives
        runCommand(board, server, {kind: "serverUpdate", mutations: []}, ids);
        expect(checkServerAgreement(board, server.player, server.otherPlayers)).toEqual([]);
        expect(checkBoardInvariants(board)).toEqual([]);
    });
});
