import {describe, expect, it} from "vitest";

import {ModuleType} from "@common/Types";

import {Board} from "../../src/graphics/cards/model/Board";
import {BoardRecipe, buildBoard, LOCAL_PLAYER, otherPlayerId} from "./support/Generators";

/**
 * What the player is and is not allowed to do to a chunk.
 *
 * Moving a chunk and rebuilding one are separate rights. Where a chunk sits is only how this player
 * has arranged their own screen, so any chunk can be dragged — including an opponent's ship. Joining
 * chunks, detaching cards and rotating them are rebuilding, and those are restricted.
 */

const FIXTURE: BoardRecipe = {
    localShip: {steps: [{variant: 0, slot: 0, rotation: 0}, {variant: 1, slot: 0, rotation: 0}], position: {x: 0, y: 0}},
    fragments: [{steps: [{variant: 2, slot: 0, rotation: 0}], position: {x: 6, y: 6}}],
    handModules: [],
    handEvents: 0,
    otherShips: [{steps: [{variant: 3, slot: 0, rotation: 0}, {variant: 4, slot: 0, rotation: 0}], position: {x: 10, y: 0}}],
    canRebuild: false,
    mainModuleChoice: 0
};

function opponentChunk(board: Board) {
    return board.getChunks().find(c => c.owner === otherPlayerId(0))!;
}

function localFragment(board: Board) {
    return board.getChunks().find(c => c.owner === LOCAL_PLAYER && !board.hasMainModule(c.id))!;
}

describe("an opponent's ship", () => {
    it("can be moved", () => {
        const board = buildBoard(FIXTURE);
        const chunk = opponentChunk(board);

        board.moveChunk(chunk.id, {x: -3, y: 4});

        expect(board.getChunk(chunk.id)!.position).toEqual({x: -3, y: 4});
    });

    it("cannot be rebuilt", () => {
        const board = buildBoard(FIXTURE);
        const chunk = opponentChunk(board);

        expect(board.isChunkModifiable(chunk.id)).toBe(false);

        for (const module of board.getChunkModules(chunk.id)) {
            expect(board.isCardModifiable(module.id)).toBe(false);
            expect(board.canDetachCard(module.id)).toBe(false);
        }
    });

    it("never snaps onto anything, however close it is dragged", () => {
        const board = buildBoard(FIXTURE);
        const chunk = opponentChunk(board);

        // park it right on top of the local ship, where a modifiable chunk would certainly snap
        board.moveChunk(chunk.id, {x: 1, y: 0});

        expect(board.findConnectionPoints(chunk.id)).toEqual([]);
        expect(board.findAutorotateTarget(chunk.id)).toBeUndefined();
    });
});

describe("the local ship outside the rebuild phase", () => {
    it("can be moved but not rebuilt", () => {
        const board = buildBoard(FIXTURE);
        const main = board.getMainChunk(LOCAL_PLAYER)!;

        board.moveChunk(main.id, {x: 2, y: 2});
        expect(board.getChunk(main.id)!.position).toEqual({x: 2, y: 2});

        expect(board.isChunkModifiable(main.id)).toBe(false);

        for (const module of board.getChunkModules(main.id)) {
            expect(board.canDetachCard(module.id)).toBe(false);
        }
    });

    it("cannot have a fragment joined to it", () => {
        const board = buildBoard(FIXTURE);
        const fragment = localFragment(board);
        const main = board.getMainChunk(LOCAL_PLAYER)!;

        // slide the fragment right up against the ship
        board.moveChunk(fragment.id, {x: main.position.x + 1, y: main.position.y});

        expect(board.findConnectionPoints(fragment.id)).toEqual([]);
    });
});

describe("the command module", () => {
    it("can never be detached, even mid-rebuild", () => {
        const board = buildBoard({...FIXTURE, canRebuild: true});
        const main = board.getMainChunk(LOCAL_PLAYER)!;

        const command = board.getChunkModules(main.id).find(m => m.type === ModuleType.MainModule)!;

        expect(board.isChunkModifiable(main.id)).toBe(true);
        expect(board.isCardModifiable(command.id)).toBe(true);

        // modifiable, yet not detachable: grabbing it moves the whole ship instead
        expect(board.canDetachCard(command.id)).toBe(false);
    });

    it("leaves the rest of the ship detachable while rebuilding", () => {
        const board = buildBoard({...FIXTURE, canRebuild: true});
        const main = board.getMainChunk(LOCAL_PLAYER)!;

        const others = board.getChunkModules(main.id).filter(m => m.type !== ModuleType.MainModule);

        expect(others.length).toBeGreaterThan(0);
        expect(others.every(m => board.canDetachCard(m.id))).toBe(true);
    });
});
