import {Vector2} from "@common/Types";
import {CardGetters} from "@common/getters/Card";

import {Board} from "../../../src/graphics/cards/model/Board";

/**
 * A comparable picture of a board.
 *
 * Chunk ids are included deliberately. A reconcile that quietly destroys and recreates a chunk each
 * time would still look right on screen but would churn ids — and that churn is what would make the
 * view rebuild shapes and drop the player's arrangement. Keeping ids in the snapshot means the
 * idempotence property catches it.
 */
export type BoardSnapshot = {
    cards: string[],
    chunks: string[]
};

export function snapshot(board: Board): BoardSnapshot {
    const cards = board.getCards()
        .map(info => {
            const id = CardGetters.id(info.card);
            const module = CardGetters.asModule(info.card);
            const layout = module ? `${module.x},${module.y},r${module.rotation},h${module.health}` : "-";

            const where = info.location.type === "hand"
                ? `hand#${info.location.index}`
                : info.location.type === "chunk"
                    ? `chunk#${info.location.chunk}`
                    : "drag";

            return `${id}:${where}:${layout}`;
        })
        .sort();

    const chunks = board.getChunks()
        .map(chunk => `${chunk.id}:${chunk.owner}:${chunk.position.x},${chunk.position.y}`)
        .sort();

    return {cards, chunks};
}

/** Where a card actually appears, which is what "nothing jumped" has to be measured against. */
export function worldPosition(board: Board, id: number): Vector2 | undefined {
    const info = board.getCard(id);

    if (info === undefined || info.location.type !== "chunk") {
        return undefined;
    }

    const chunk = board.getChunk(info.location.chunk);
    const module = CardGetters.asModule(info.card);

    if (chunk === undefined || module === undefined) {
        return undefined;
    }

    return {x: chunk.position.x + module.x, y: chunk.position.y + module.y};
}

/** Ids of the cards sitting in a fragment — a non-main chunk, which is really the hand. */
export function fragmentCardIds(board: Board): number[] {
    return board.getChunks()
        .filter(chunk => !board.hasMainModule(chunk.id))
        .flatMap(chunk => board.getChunkCards(chunk.id))
        .map(info => CardGetters.id(info.card));
}

export function handIds(board: Board): number[] {
    return board.getHand().map(info => CardGetters.id(info.card));
}
