import {describe, expect, it} from "vitest";
import fc from "fast-check";

import {CardGetters} from "@common/getters/Card";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import {Board} from "../../src/graphics/cards/model/Board";
import {deserialize, serialize} from "../../src/graphics/cards/model/Persist";
import {reconcile} from "../../src/graphics/cards/model/Reconcile";
import {boardRecipeArb, buildBoard, freeSlots, serverFromBoard} from "./support/Generators";
import {checkBoardInvariants, checkServerAgreement} from "./support/Invariants";
import {applyMutations, freshIds, mutationsArb, ServerState} from "./support/ServerMutations";
import {handIds, snapshot} from "./support/Snapshot";

/**
 * Storage is a hint, not truth. Two things have to hold: what was written comes back unchanged, and
 * nothing that could possibly be read back is allowed to break the client — because storage going
 * stale is the normal case for this feature, not an error in it.
 */
describe("a stored board comes back as it went in", () => {
    it("round-trips", () => {
        fc.assert(
            fc.property(boardRecipeArb, recipe => {
                const board = buildBoard(recipe);
                const restored = deserialize(serialize(board));

                expect(restored).toBeDefined();
                expect(snapshot(restored!)).toEqual(snapshot(board));
            }),
            {numRuns: 300}
        );
    });

    it("keeps the player's hand in order", () => {
        fc.assert(
            fc.property(boardRecipeArb, recipe => {
                const board = buildBoard(recipe);
                const restored = deserialize(serialize(board))!;

                expect(handIds(restored)).toEqual(handIds(board));
            }),
            {numRuns: 200}
        );
    });
});

describe("restoring is a hint the server can overrule", () => {
    it("keeps the arrangement the player left behind", () => {
        fc.assert(
            fc.property(boardRecipeArb, recipe => {
                const board = buildBoard({...recipe, canRebuild: false});
                const server: ServerState = serverFromBoard(board);

                // the player closed the tab and came back to an unchanged game
                const restored = deserialize(serialize(board))!;
                reconcile(restored, server.player, server.otherPlayers);

                expect(snapshot(restored)).toEqual(snapshot(board));
            }),
            {numRuns: 300}
        );
    });

    it("still ends up agreeing with a game that moved on while the player was away", () => {
        fc.assert(
            fc.property(boardRecipeArb, mutationsArb, (recipe, mutations) => {
                const board = buildBoard({...recipe, canRebuild: false});
                const server: ServerState = serverFromBoard(board);

                applyMutations(server, mutations, freshIds());

                const restored = deserialize(serialize(board))!;
                reconcile(restored, server.player, server.otherPlayers);

                expect(checkBoardInvariants(restored)).toEqual([]);
                expect(checkServerAgreement(restored, server.player, server.otherPlayers)).toEqual([]);
            }),
            {numRuns: 300}
        );
    });

    it("survives storage written by a different game entirely", () => {
        fc.assert(
            fc.property(boardRecipeArb, boardRecipeArb, (mine, theirs) => {
                // the very worst a restore can hand us: ids that mean something else entirely
                const stored = buildBoard({...mine, canRebuild: false});
                const actual = buildBoard({...theirs, canRebuild: false});

                const server: ServerState = serverFromBoard(actual);

                // it loads — it was a perfectly well-formed board, just of another game entirely
                const restored = deserialize(serialize(stored));
                expect(restored).toBeDefined();

                reconcile(restored!, server.player, server.otherPlayers);

                expect(checkBoardInvariants(restored)).toEqual([]);
                expect(checkServerAgreement(restored, server.player, server.otherPlayers)).toEqual([]);
            }),
            {numRuns: 200}
        );
    });
});

describe("an unsubmitted rebuild survives the player reloading", () => {
    const fixture = {
        localShip: {steps: [{variant: 0, slot: 0, rotation: 0}, {variant: 1, slot: 0, rotation: 0}], position: {x: 0, y: 0}},
        fragments: [],
        handModules: [{variant: 2, slot: 0, rotation: 0}, {variant: 5, slot: 0, rotation: 0}],
        handEvents: 0,
        otherShips: [{steps: [{variant: 3, slot: 0, rotation: 0}], position: {x: 10, y: 0}}],
        canRebuild: true,
        mainModuleChoice: 0
    };

    /**
     * The player attaching a hand module to their ship, mid-rebuild. Nothing is submitted, so the
     * server still has this card in their hand — the divergence the whole test turns on.
     */
    function attachToShip(board: Board) {
        const main = board.getMainChunk(board.getThisPlayer())!;
        const ship = board.getChunkSpaceship(main.id);

        for (const info of board.getHand()) {
            const module = CardGetters.asModule(info.card);

            if (module === undefined) {
                continue;
            }

            for (const slot of freeSlots(ship)) {
                const rotations = SpaceshipGetters.getPossibleRotationsFor(ship, module, slot.x, slot.y);

                if (rotations.length === 0) {
                    continue;
                }

                module.rotation = rotations[0];
                board.addCardToChunk(module.id, main.id, slot);

                return module.id;
            }
        }

        return undefined;
    }

    it("keeps a module attached to the ship that the server still calls a hand card", () => {
        const board = buildBoard(fixture);
        const server: ServerState = serverFromBoard(board);

        const attached = attachToShip(board);
        expect(attached, "the fixture must actually allow an attachment").toBeDefined();

        const main = board.getMainChunk(board.getThisPlayer())!;
        expect(board.getChunkModules(main.id).map(m => m.id)).toContain(attached);

        // the server has not been told: to it, this card is still in the hand
        expect(server.player.hand.map(CardGetters.id)).toContain(attached);

        // reload
        const restored = deserialize(serialize(board))!;
        expect(restored).toBeDefined();
        expect(restored.getCanRebuild()).toBe(true);

        reconcile(restored, server.player, server.otherPlayers);

        const restoredMain = restored.getMainChunk(restored.getThisPlayer())!;

        expect(restoredMain).toBeDefined();
        expect(restoredMain && restored.getChunkModules(restoredMain.id).map(m => m.id)).toContain(attached);
        expect(handIds(restored)).not.toContain(attached);

        expect(checkBoardInvariants(restored)).toEqual([]);
        expect(checkServerAgreement(restored, server.player, server.otherPlayers)).toEqual([]);
    });

    it("hands the module back once the rebuild phase is over", () => {
        const board = buildBoard(fixture);
        const server: ServerState = serverFromBoard(board);

        const attached = attachToShip(board)!;

        // the phase ended without the attachment ever being submitted, so the server's word stands
        board.setCanRebuild(false);

        const restored = deserialize(serialize(board))!;
        expect(restored.getCanRebuild()).toBe(false);

        reconcile(restored, server.player, server.otherPlayers);

        expect(handIds(restored)).toContain(attached);
        expect(checkServerAgreement(restored, server.player, server.otherPlayers)).toEqual([]);
    });
});

describe("nothing that can be read back is allowed to throw", () => {
    it("rejects arbitrary strings without throwing", () => {
        fc.assert(
            fc.property(fc.string(), stored => {
                expect(() => deserialize(stored)).not.toThrow();
            }),
            {numRuns: 500}
        );
    });

    it("rejects arbitrary JSON without throwing", () => {
        fc.assert(
            fc.property(fc.json(), stored => {
                expect(() => deserialize(stored)).not.toThrow();
            }),
            {numRuns: 500}
        );
    });

    it("rejects a stored board that has been corrupted, whatever was corrupted", () => {
        fc.assert(
            fc.property(boardRecipeArb, fc.nat({max: 1000}), (recipe, pick) => {
                const board = buildBoard(recipe);
                const stored = JSON.parse(serialize(board));

                // knock out one arbitrary key somewhere in the stored tree
                const keys: { holder: any, key: string }[] = [];
                const walk = (node: any) => {
                    if (node === null || typeof node !== "object") {
                        return;
                    }

                    for (const key of Object.keys(node)) {
                        keys.push({holder: node, key});
                        walk(node[key]);
                    }
                };
                walk(stored);

                const victim = keys[pick % keys.length];
                delete victim.holder[victim.key];

                expect(() => deserialize(JSON.stringify(stored))).not.toThrow();
            }),
            {numRuns: 400}
        );
    });

    it("discards a board it cannot trust rather than half-loading it", () => {
        expect(deserialize(null)).toBeUndefined();
        expect(deserialize("")).toBeUndefined();
        expect(deserialize("not json at all")).toBeUndefined();
        expect(deserialize("[]")).toBeUndefined();
        expect(deserialize('{"version":999,"thisPlayer":1,"chunks":[],"cards":[]}')).toBeUndefined();
    });

    it("discards storage from an older schema", () => {
        const board = buildBoard({
            localShip: {steps: [{variant: 0, slot: 0, rotation: 0}], position: {x: 0, y: 0}},
            fragments: [],
            handModules: [],
            handEvents: 0,
            otherShips: [{steps: [{variant: 1, slot: 0, rotation: 0}], position: {x: 8, y: 0}}],
            canRebuild: false,
            mainModuleChoice: 0
        });

        const stored = JSON.parse(serialize(board));
        stored.version = 0;

        // a version bump means discard, never migrate-and-hope
        expect(deserialize(JSON.stringify(stored))).toBeUndefined();
    });

    it("discards a board whose cards point at chunks that are not there", () => {
        const board = buildBoard({
            localShip: {steps: [{variant: 0, slot: 0, rotation: 0}, {variant: 1, slot: 0, rotation: 0}], position: {x: 0, y: 0}},
            fragments: [],
            handModules: [],
            handEvents: 0,
            otherShips: [{steps: [{variant: 2, slot: 0, rotation: 0}], position: {x: 8, y: 0}}],
            canRebuild: false,
            mainModuleChoice: 0
        });

        const stored = JSON.parse(serialize(board));
        stored.chunks = [];

        expect(deserialize(JSON.stringify(stored))).toBeUndefined();
    });

    it("discards a board with an event card sitting on the field", () => {
        const board = buildBoard({
            localShip: {steps: [{variant: 0, slot: 0, rotation: 0}], position: {x: 0, y: 0}},
            fragments: [],
            handModules: [],
            handEvents: 1,
            otherShips: [{steps: [{variant: 1, slot: 0, rotation: 0}], position: {x: 8, y: 0}}],
            canRebuild: false,
            mainModuleChoice: 0
        });

        const stored = JSON.parse(serialize(board));
        const chunk = stored.chunks[0];
        const event = stored.cards.find((entry: any) => entry.card.cardType === "event");

        event.location = {type: "chunk", chunk: chunk.id};

        // reconcile asserts on this, so storage must never be able to hand it over
        expect(deserialize(JSON.stringify(stored))).toBeUndefined();
    });

    it("puts a card that was in flight back into the hand", () => {
        const board = buildBoard({
            localShip: {steps: [{variant: 0, slot: 0, rotation: 0}], position: {x: 0, y: 0}},
            fragments: [],
            handModules: [{variant: 1, slot: 0, rotation: 0}],
            handEvents: 0,
            otherShips: [{steps: [{variant: 2, slot: 0, rotation: 0}], position: {x: 8, y: 0}}],
            canRebuild: false,
            mainModuleChoice: 0
        });

        const dragged = CardGetters.id(board.getHand()[0].card);
        board.removeFromHand(dragged);

        // the tab closed with a card mid-drag: it is neither in hand nor on the field
        const restored = deserialize(serialize(board))!;

        expect(restored).toBeDefined();
        expect(handIds(restored)).toContain(dragged);
        expect(checkBoardInvariants(restored)).toEqual([]);
    });
});
