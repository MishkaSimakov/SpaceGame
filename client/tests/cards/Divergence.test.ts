import {describe, expect, it} from "vitest";
import fc from "fast-check";

import {CardGetters} from "@common/getters/Card";

import {reconcile} from "../../src/graphics/cards/model/Reconcile";
import {boardRecipeArb, buildBoard, LOCAL_PLAYER, otherPlayerId, serverFromBoard} from "./support/Generators";
import {checkBoardInvariants, checkServerAgreement} from "./support/Invariants";
import {applyMutations, freshIds, ServerState} from "./support/ServerMutations";

/**
 * The board being merely *stale* is the easy case: the server moved on and reconcile catches it up.
 * The hard case is the board being *wrong* — holding cards in the wrong place, at the wrong
 * coordinates, under the wrong owner — with no transition that explains how it got there.
 *
 * That is what a restore from old localStorage produces, and it is the case where reconcile has to
 * correct the board rather than extend it.
 */

const FIXTURE = {
    localShip: {steps: [{variant: 0, slot: 0, rotation: 0}, {variant: 1, slot: 0, rotation: 0}], position: {x: 0, y: 0}},
    fragments: [{steps: [{variant: 2, slot: 0, rotation: 0}], position: {x: 7, y: 7}}],
    handModules: [{variant: 3, slot: 0, rotation: 0}],
    handEvents: 1,
    otherShips: [{steps: [{variant: 4, slot: 0, rotation: 0}, {variant: 5, slot: 0, rotation: 0}], position: {x: 10, y: 0}}],
    canRebuild: false,
    mainModuleChoice: 0
};

describe("reconcile corrects a board that is simply wrong", () => {
    it("overwrites a ship layout the board has got wrong", () => {
        const board = buildBoard(FIXTURE);
        const server: ServerState = serverFromBoard(board);

        const chunk = board.getMainChunk(LOCAL_PLAYER)!;
        const modules = board.getChunkModules(chunk.id);
        const victim = modules.find(m => m.id !== modules[0].id)!;

        // the board's idea of where this module sits is nonsense — as a stale restore would leave it
        victim.x += 5;
        victim.y -= 3;
        victim.rotation = (victim.rotation + 1) % 4;

        expect(checkBoardInvariants(board)).not.toEqual([]);

        reconcile(board, server.player, server.otherPlayers);

        const expected = server.player.spaceship.modules.find(m => m.id === victim.id)!;
        const actual = CardGetters.asModule(board.getCard(victim.id)!.card)!;

        // the ship's layout IS server state, so the server's wins
        expect({x: actual.x, y: actual.y, rotation: actual.rotation})
            .toEqual({x: expected.x, y: expected.y, rotation: expected.rotation});

        expect(checkBoardInvariants(board)).toEqual([]);
        expect(checkServerAgreement(board, server.player, server.otherPlayers)).toEqual([]);
    });

    it("moves a captured module onto the captor's ship", () => {
        const board = buildBoard(FIXTURE);
        const server: ServerState = serverFromBoard(board);

        const before = new Set(server.player.spaceship.modules.map(m => m.id));

        applyMutations(server, [{kind: "captureModule", pick: 0, opponent: 0, slot: 0}], freshIds());

        const captured = [...before].find(id => server.otherPlayers[0].spaceship.modules.some(m => m.id === id));
        expect(captured, "the fixture must actually produce a capture").toBeDefined();

        // the board still has it on OUR ship — an owner change no local action could explain
        expect(checkServerAgreement(board, server.player, server.otherPlayers)).not.toEqual([]);

        reconcile(board, server.player, server.otherPlayers);

        const location = board.getCard(captured!)!.location;
        expect(location.type).toBe("chunk");

        const chunk = board.getChunk((location as { chunk: number }).chunk)!;
        expect(chunk.owner).toBe(otherPlayerId(0));

        expect(checkBoardInvariants(board)).toEqual([]);
        expect(checkServerAgreement(board, server.player, server.otherPlayers)).toEqual([]);
    });

    it("pulls a card out of a fragment when the server has put it on the ship", () => {
        const board = buildBoard(FIXTURE);
        const server: ServerState = serverFromBoard(board);

        // the board holds this card loose on the field; the server says it is part of the ship —
        // a divergence no local edit produced, and the server must win
        const fragment = board.getChunks().find(c => c.owner === LOCAL_PLAYER && !board.hasMainModule(c.id))!;
        const stray = board.getChunkModules(fragment.id)[0];

        const shipModule = structuredClone(stray);
        const berth = server.player.spaceship.modules[0];
        shipModule.x = berth.x + 1;
        shipModule.y = berth.y;

        server.player.hand = server.player.hand.filter(card => CardGetters.id(card) !== stray.id);
        server.player.spaceship.modules.push(shipModule);

        expect(checkServerAgreement(board, server.player, server.otherPlayers)).not.toEqual([]);

        reconcile(board, server.player, server.otherPlayers);

        const location = board.getCard(stray.id)!.location;
        expect(location.type).toBe("chunk");

        const chunk = board.getChunk((location as { chunk: number }).chunk)!;
        expect(board.hasMainModule(chunk.id)).toBe(true);

        expect(checkServerAgreement(board, server.player, server.otherPlayers)).toEqual([]);
    });
});

describe("reconcile survives a board that shares nothing but card ids with the server", () => {
    /**
     * The adversarial case: reconcile a board built from one game against a server state built from a
     * different one. Ids overlap, but a card's type, stats, owner, zone and position may all disagree.
     *
     * This is deliberately harsher than anything the game can produce — it is the shape of a restore
     * from storage that no longer matches reality, and reconcile must land on a sound board that
     * agrees with the server rather than trusting a word of what it loaded.
     */
    it("still lands on a sound board that agrees with the server", () => {
        fc.assert(
            fc.property(boardRecipeArb, boardRecipeArb, (mine, theirs) => {
                const board = buildBoard({...mine, canRebuild: false});
                const other = buildBoard({...theirs, canRebuild: false});

                const server: ServerState = serverFromBoard(other);

                reconcile(board, server.player, server.otherPlayers);

                expect(checkBoardInvariants(board)).toEqual([]);
                expect(checkServerAgreement(board, server.player, server.otherPlayers)).toEqual([]);
            }),
            {numRuns: 300}
        );
    });

    it("is still idempotent when it had to correct the board wholesale", () => {
        fc.assert(
            fc.property(boardRecipeArb, boardRecipeArb, (mine, theirs) => {
                const board = buildBoard({...mine, canRebuild: false});
                const other = buildBoard({...theirs, canRebuild: false});

                const server: ServerState = serverFromBoard(other);

                reconcile(board, server.player, server.otherPlayers);
                const once = checkServerAgreement(board, server.player, server.otherPlayers);

                reconcile(board, server.player, server.otherPlayers);
                const twice = checkServerAgreement(board, server.player, server.otherPlayers);

                expect(once).toEqual([]);
                expect(twice).toEqual([]);
            }),
            {numRuns: 200}
        );
    });
});
