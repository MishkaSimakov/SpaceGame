import {describe, expect, it} from "vitest";
import fc from "fast-check";

import {ModuleType} from "@common/Types";

import {Board} from "../../src/graphics/cards/model/Board";
import {BoardRecipe, boardArb, buildBoard, LOCAL_PLAYER, otherPlayerId, serverFromBoard} from "./support/Generators";
import {checkBoardInvariants, checkServerAgreement} from "./support/Invariants";
import {asCard, eventAsCard, IdAllocator, makeEvent, makeMainModule, makeModule, MODULE_VARIANTS} from "./support/Cards";

/**
 * A guard that has never failed is worthless, so every check here is exercised twice: once against
 * generated boards, which must be sound, and once against a board broken in precisely the way that
 * check exists to catch.
 */

const HEALTHY: BoardRecipe = {
    localShip: {steps: [{variant: 0, slot: 0, rotation: 0}, {variant: 1, slot: 0, rotation: 0}], position: {x: 0, y: 0}},
    fragments: [{steps: [{variant: 2, slot: 0, rotation: 0}], position: {x: 5, y: 5}}],
    handModules: [{variant: 3, slot: 0, rotation: 0}],
    handEvents: 1,
    otherShips: [{steps: [{variant: 4, slot: 0, rotation: 0}], position: {x: 10, y: 0}}],
    canRebuild: false,
    mainModuleChoice: 0
};

function healthyBoard(): Board {
    return buildBoard(HEALTHY);
}

describe("board invariants hold for generated boards", () => {
    it("every generated board is well-formed", () => {
        fc.assert(
            fc.property(boardArb, board => {
                expect(checkBoardInvariants(board)).toEqual([]);
            }),
            {numRuns: 300}
        );
    });

    it("every generated board agrees with the server state derived from it", () => {
        fc.assert(
            fc.property(boardArb, board => {
                const {player, otherPlayers} = serverFromBoard(board);
                expect(checkServerAgreement(board, player, otherPlayers)).toEqual([]);
            }),
            {numRuns: 300}
        );
    });

    it("the healthy fixture is actually healthy", () => {
        const board = healthyBoard();

        expect(checkBoardInvariants(board)).toEqual([]);

        const {player, otherPlayers} = serverFromBoard(board);
        expect(checkServerAgreement(board, player, otherPlayers)).toEqual([]);
    });
});

describe("board invariants catch broken boards", () => {
    it("catches a disconnected chunk", () => {
        const board = healthyBoard();

        const chunk = board.getMainChunk(LOCAL_PLAYER)!;
        const modules = board.getChunkModules(chunk.id);
        const stray = modules.find(m => m.type !== ModuleType.MainModule)!;

        stray.x += 9;

        expect(checkBoardInvariants(board).join()).toMatch(/not connected/);
    });

    it("catches two modules stacked on one cell", () => {
        const board = healthyBoard();

        const chunk = board.getMainChunk(LOCAL_PLAYER)!;
        const modules = board.getChunkModules(chunk.id);
        const stray = modules.find(m => m.type !== ModuleType.MainModule)!;
        const main = modules.find(m => m.type === ModuleType.MainModule)!;

        stray.x = main.x;
        stray.y = main.y;

        expect(checkBoardInvariants(board).join()).toMatch(/two modules on one cell/);
    });

    it("catches mismatched connectors", () => {
        const board = healthyBoard();

        const chunk = board.getMainChunk(LOCAL_PLAYER)!;
        const stray = board.getChunkModules(chunk.id).find(m => m.type !== ModuleType.MainModule)!;

        stray.connectors = {top: 0, right: 0, bottom: 0, left: 0};

        // severing every connector both mismatches the neighbour it was joined to and cuts it loose
        expect(checkBoardInvariants(board).join()).toMatch(/mismatched connectors|not connected/);
    });

    it("catches a non-contiguous hand", () => {
        const board = healthyBoard();

        const card = board.getHand()[0];
        card.location = {type: "hand", index: 99};

        expect(checkBoardInvariants(board).join()).toMatch(/not contiguous/);
    });

    it("catches a card pointing at a chunk that does not exist", () => {
        const board = healthyBoard();

        const card = board.getHand()[0];
        card.location = {type: "chunk", chunk: 9999};

        expect(checkBoardInvariants(board).join()).toMatch(/references missing chunk/);
    });

    it("catches an event card on the field", () => {
        const board = healthyBoard();

        const chunk = board.getMainChunk(LOCAL_PLAYER)!;
        const event = board.getHand().find(info => info.card.cardType === "event")!;

        event.location = {type: "chunk", chunk: chunk.id};

        expect(checkBoardInvariants(board).join()).toMatch(/event card .* is on the field/);
    });

    it("catches an empty chunk", () => {
        const board = healthyBoard();

        board.createChunk(LOCAL_PLAYER, {x: 3, y: 3});

        expect(checkBoardInvariants(board).join()).toMatch(/is empty/);
    });

    it("catches a player owning two main chunks", () => {
        const board = healthyBoard();

        const ids = new IdAllocator();
        const second = board.createChunk(LOCAL_PLAYER, {x: 20, y: 20});
        const main = makeMainModule(ids, "AttackOrRunaway" as any);
        main.id = 100000;

        board.addCard(asCard(main), {type: "chunk", chunk: second.id});

        expect(checkBoardInvariants(board).join()).toMatch(/has 2 main chunks/);
    });

    it("catches an opponent showing more than their ship", () => {
        const board = healthyBoard();

        const ids = new IdAllocator();
        const extra = board.createChunk(otherPlayerId(0), {x: 30, y: 30});

        const module = makeModule(ids, MODULE_VARIANTS[0]);
        module.id = 200000;

        // any second chunk for an opponent is wrong: their hand, and so their fragments, are hidden
        board.addCard(asCard(module), {type: "chunk", chunk: extra.id});

        expect(checkBoardInvariants(board).join()).toMatch(/expected exactly 1/);
    });
});

describe("server agreement catches disagreement", () => {
    it("catches a card the server no longer has", () => {
        const board = healthyBoard();
        const {player, otherPlayers} = serverFromBoard(board);

        player.hand = player.hand.slice(1);

        expect(checkServerAgreement(board, player, otherPlayers).join())
            .toMatch(/on the board but not in the server state/);
    });

    it("catches a card the board does not have yet", () => {
        const board = healthyBoard();
        const {player, otherPlayers} = serverFromBoard(board);

        const ids = new IdAllocator();
        const fresh = makeEvent(ids);
        fresh.id = 300000;
        player.hand.push(eventAsCard(fresh));

        expect(checkServerAgreement(board, player, otherPlayers).join())
            .toMatch(/in the server state but not on the board/);
    });

    it("catches stale module data — the health of a damaged module", () => {
        const board = healthyBoard();
        const {player, otherPlayers} = serverFromBoard(board);

        // health is the server's to dictate: a board still showing the old value is out of date, and
        // must be reported as such
        player.spaceship.modules[0].health -= 1;

        expect(checkServerAgreement(board, player, otherPlayers).join()).toMatch(/has stale data/);
    });

    it("catches an opponent's field disagreeing with their ship", () => {
        const board = healthyBoard();
        const {player, otherPlayers} = serverFromBoard(board);

        otherPlayers[0].spaceship.modules = otherPlayers[0].spaceship.modules.slice(1);

        expect(checkServerAgreement(board, player, otherPlayers).join())
            .toMatch(/field .* != server ship|but not in the server state/);
    });

    it("catches a card the server puts in hand but the board leaves on the ship", () => {
        const board = healthyBoard();
        const {player, otherPlayers} = serverFromBoard(board);

        // move a module off the server's ship and into its hand; the board still has it on the ship
        const moved = player.spaceship.modules.pop()!;
        player.hand.push({cardType: "module", module: moved});

        expect(checkServerAgreement(board, player, otherPlayers).join())
            .toMatch(/main chunk .* != server ship/);
    });

    it("allows that same disagreement while the player is mid-rebuild", () => {
        const board = healthyBoard();
        const {player, otherPlayers} = serverFromBoard(board);

        const moved = player.spaceship.modules.pop()!;
        player.hand.push({cardType: "module", module: moved});

        board.setCanRebuild(true);

        // uncommitted edits are the player's until they submit them: membership still agrees, so
        // there is nothing to report
        expect(checkServerAgreement(board, player, otherPlayers)).toEqual([]);
    });
});
