import fc from "fast-check";

import {Card, ModuleCard, OtherPlayer, Player, PlayerId, Spaceship, Vector2} from "@common/Types";
import {directions, SpaceshipGetters} from "@common/getters/Spaceship";

import {Board} from "../../../src/graphics/cards/model/Board";
import {
    asCard,
    eventAsCard,
    IdAllocator,
    MAIN_MODULE_TYPES,
    makeEvent,
    makeMainModule,
    makeModule,
    MODULE_VARIANTS,
    ModuleVariant
} from "./Cards";

/**
 * Generators for legal ships and boards.
 *
 * Ships are grown, never assembled: a module is only ever placed at a slot that
 * `SpaceshipGetters.getPossibleRotationsFor` already accepts. A generated ship therefore satisfies
 * `checkConfiguration` by construction, so any failure a property test reports is a defect in the
 * code under test rather than a malformed input.
 *
 * Only the local player has a hand and fragments. Other players' hands are hidden, and a fragment
 * *is* a hand card that happens to be pre-assembled on the field — so an opponent shows exactly one
 * chunk, their real ship.
 */

/** One step of growth: which module to try, where to attach it, and at which of the legal rotations. */
export type GrowthStep = {
    variant: number,
    slot: number,
    rotation: number
};

export const growthStepArb: fc.Arbitrary<GrowthStep> = fc.record({
    variant: fc.nat({max: 1000}),
    slot: fc.nat({max: 1000}),
    rotation: fc.nat({max: 1000})
});

/** Every empty cell adjacent to the ship. These are the only places a module may go. */
export function freeSlots(ship: Spaceship): Vector2[] {
    const slots: Vector2[] = [];

    for (const module of ship.modules) {
        for (const direction of Object.values(directions)) {
            const position = {x: module.x + direction.x, y: module.y + direction.y};

            if (SpaceshipGetters.getModuleByPosition(ship, position)) {
                continue;
            }

            if (!slots.some(s => s.x === position.x && s.y === position.y)) {
                slots.push(position);
            }
        }
    }

    return slots;
}

/**
 * Attaches one module, if any legal (slot, rotation) exists for it. A step that fits nowhere is
 * dropped, which is why a grown ship can be smaller than the recipe that produced it.
 */
function grow(ship: Spaceship, module: ModuleCard, step: GrowthStep) {
    const candidates: { position: Vector2, rotation: number }[] = [];

    for (const slot of freeSlots(ship)) {
        for (const rotation of SpaceshipGetters.getPossibleRotationsFor(ship, module, slot.x, slot.y)) {
            candidates.push({position: slot, rotation});
        }
    }

    if (candidates.length === 0) {
        return;
    }

    const chosen = candidates[step.slot % candidates.length];

    module.x = chosen.position.x;
    module.y = chosen.position.y;
    module.rotation = chosen.rotation;

    ship.modules.push(module);
}

const variantAt = (i: number): ModuleVariant => MODULE_VARIANTS[i % MODULE_VARIANTS.length];

/**
 * Grows a ship from a recipe. With `mainModuleType` it is a player's real ship; without one it is a
 * fragment — a pre-assembled group of hand cards sitting on the field.
 */
export function buildShip(ids: IdAllocator, steps: GrowthStep[], mainModuleType?: string): ModuleCard[] {
    const ship: Spaceship = {modules: []};

    if (mainModuleType !== undefined) {
        ship.modules.push(makeMainModule(ids, mainModuleType as any));
    } else if (steps.length > 0) {
        // a fragment needs a seed module before anything can attach to it
        const seed = makeModule(ids, variantAt(steps[0].variant));
        seed.rotation = steps[0].rotation % 4;
        ship.modules.push(seed);

        steps = steps.slice(1);
    }

    for (const step of steps) {
        grow(ship, makeModule(ids, variantAt(step.variant)), step);
    }

    return ship.modules;
}

/** A recipe for one chunk on the field. */
export type ChunkRecipe = {
    steps: GrowthStep[],
    position: Vector2
};

const positionArb = fc.record({
    x: fc.integer({min: -20, max: 20}),
    y: fc.integer({min: -20, max: 20})
});

export const chunkRecipeArb = (maxModules: number): fc.Arbitrary<ChunkRecipe> => fc.record({
    steps: fc.array(growthStepArb, {minLength: 1, maxLength: maxModules}),
    position: positionArb
});

export type BoardRecipe = {
    localShip: ChunkRecipe,
    fragments: ChunkRecipe[],
    handModules: GrowthStep[],
    handEvents: number,
    otherShips: ChunkRecipe[],
    canRebuild: boolean,
    mainModuleChoice: number
};

export const boardRecipeArb: fc.Arbitrary<BoardRecipe> = fc.record({
    localShip: chunkRecipeArb(6),
    fragments: fc.array(chunkRecipeArb(3), {maxLength: 2}),
    handModules: fc.array(growthStepArb, {maxLength: 4}),
    handEvents: fc.nat({max: 2}),
    otherShips: fc.array(chunkRecipeArb(5), {minLength: 1, maxLength: 4}),
    canRebuild: fc.boolean(),
    mainModuleChoice: fc.nat({max: 100})
});

export const LOCAL_PLAYER = "player-0" as unknown as PlayerId;

export function otherPlayerId(index: number): PlayerId {
    return `player-${index + 1}` as unknown as PlayerId;
}

/** Realises a recipe as a Board. */
export function buildBoard(recipe: BoardRecipe): Board {
    const ids = new IdAllocator();

    const board = new Board(LOCAL_PLAYER);
    board.setCanRebuild(recipe.canRebuild);

    const mainModuleType = MAIN_MODULE_TYPES[recipe.mainModuleChoice % MAIN_MODULE_TYPES.length];
    const localModules = buildShip(ids, recipe.localShip.steps, mainModuleType);

    const localChunk = board.createChunk(LOCAL_PLAYER, recipe.localShip.position);
    for (const module of localModules) {
        board.addCard(asCard(module), {type: "chunk", chunk: localChunk.id});
    }

    for (const fragmentRecipe of recipe.fragments) {
        const modules = buildShip(ids, fragmentRecipe.steps);

        if (modules.length === 0) {
            continue;
        }

        const chunk = board.createChunk(LOCAL_PLAYER, fragmentRecipe.position);
        for (const module of modules) {
            board.addCard(asCard(module), {type: "chunk", chunk: chunk.id});
        }
    }

    recipe.otherShips.forEach((shipRecipe, index) => {
        const player = otherPlayerId(index);
        const type = MAIN_MODULE_TYPES[(recipe.mainModuleChoice + index + 1) % MAIN_MODULE_TYPES.length];

        const modules = buildShip(ids, shipRecipe.steps, type);
        const chunk = board.createChunk(player, shipRecipe.position);

        for (const module of modules) {
            board.addCard(asCard(module), {type: "chunk", chunk: chunk.id});
        }
    });

    const hand: Card[] = [];

    for (const step of recipe.handModules) {
        hand.push(asCard(makeModule(ids, variantAt(step.variant))));
    }

    for (let i = 0; i < recipe.handEvents; ++i) {
        hand.push(eventAsCard(makeEvent(ids)));
    }

    hand.forEach((card, index) => board.addCard(card, {type: "hand", index}));

    return board;
}

export const boardArb: fc.Arbitrary<Board> = boardRecipeArb.map(buildBoard);

/**
 * The server state a board is currently in agreement with: the local player's ship is their main
 * chunk, and their hand is their hand cards plus every module sitting in a fragment.
 *
 * Deep-copied on the way out, the way a DTO arriving over the socket would be. Sharing card objects
 * with the board would let agreement checks pass on identity and hide exactly the staleness this is
 * meant to catch.
 */
export function serverFromBoard(board: Board): { player: Player, otherPlayers: OtherPlayer[] } {
    const local = board.getThisPlayer();

    const mainChunk = board.getMainChunk(local);
    const spaceship: Spaceship = {
        modules: mainChunk ? board.getChunkModules(mainChunk.id) : []
    };

    const fragmentCards = board.getChunks()
        .filter(c => c.owner === local && c.id !== mainChunk?.id)
        .flatMap(c => board.getChunkCards(c.id))
        .map(info => info.card);

    const player: Player = {
        id: local,
        name: "local",
        spaceship,
        hand: [...board.getHand().map(info => info.card), ...fragmentCards],
        energy: 0,
        skipNextTurn: false,
        usedModuleSecondTimeOnThisTurn: false,
        lose: false,
        time: 0
    };

    const otherPlayers: OtherPlayer[] = board.getChunks()
        .filter(c => c.owner !== local)
        .map(chunk => ({
            id: chunk.owner,
            name: String(chunk.owner),
            energy: 0,
            spaceship: {modules: board.getChunkModules(chunk.id)},
            handSize: 0,
            lose: false
        }));

    return structuredClone({player, otherPlayers});
}
