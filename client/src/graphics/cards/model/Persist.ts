import {Card, PlayerId, Vector2} from "@common/Types";
import {CardGetters} from "@common/getters/Card";

import {Board} from "./Board";
import {CardLocation} from "./CardInfo";
import {ChunkId} from "./Chunk";
import {validateBoard} from "./Validate";

/**
 * Storing the player's arrangement between sessions, so a reconnecting player finds their cards
 * where they left them.
 *
 * What is stored is a *hint*, never truth. It is loaded, and then reconciled against the server,
 * which wins on everything it owns. So the whole card is written out, stale data and all — there is
 * no need for it to be right, only for it to be well-formed.
 *
 * `deserialize` is total: corrupt JSON, an unknown version, ids that no longer exist, a board that
 * does not hold together — all of these are *expected*, because the game moves on while the player
 * is away. Every one of them means "start fresh", never "crash": an unusable arrangement costs the
 * player nothing but their layout, whereas throwing here would cost them the game.
 *
 * Nothing here touches localStorage: the model stays free of the browser, and the view does the I/O.
 */

const VERSION = 2;

type PersistedBoard = {
    version: number,
    thisPlayer: PlayerId,
    /**
     * Whether the player was part-way through rebuilding.
     *
     * This has to be stored, because it decides whether reconcile may overrule the arrangement being
     * restored. A module the player has attached to their ship but not yet submitted is a card the
     * server still believes is in their hand; only while rebuilding does reconcile leave that alone.
     * Come back without this and the first incoming state pulls the module straight back off the ship.
     */
    canRebuild: boolean,
    chunks: {
        id: ChunkId,
        owner: PlayerId,
        position: Vector2,
        activatedProtector?: Vector2
    }[],
    cards: {
        card: Card,
        location: CardLocation
    }[]
};

export function serialize(board: Board): string {
    const hand = board.getHand();

    // a card in flight belongs nowhere; park it at the end of the hand, which is where letting go
    // over open space would have put it anyway
    const dragged = board.getCards().filter(info => info.location.type === "drag");

    const cards: PersistedBoard["cards"] = [
        ...board.getCards()
            .filter(info => info.location.type === "chunk")
            .map(info => ({card: info.card, location: info.location})),
        ...hand.map((info, index) => ({
            card: info.card,
            location: {type: "hand", index} as CardLocation
        })),
        ...dragged.map((info, index) => ({
            card: info.card,
            location: {type: "hand", index: hand.length + index} as CardLocation
        }))
    ];

    const state: PersistedBoard = {
        version: VERSION,
        thisPlayer: board.getThisPlayer(),
        canRebuild: board.getCanRebuild(),
        chunks: board.getChunks().map(chunk => ({
            id: chunk.id,
            owner: chunk.owner,
            position: chunk.position,
            activatedProtector: chunk.activatedProtector
        })),
        cards
    };

    return JSON.stringify(state);
}

function isVector(value: any): value is Vector2 {
    return value !== null
        && typeof value === "object"
        && typeof value.x === "number"
        && typeof value.y === "number";
}

function isCard(value: any): value is Card {
    if (value === null || typeof value !== "object") {
        return false;
    }

    if (value.cardType === "module") {
        const module = value.module;

        return module !== null
            && typeof module === "object"
            && typeof module.id === "number"
            && typeof module.x === "number"
            && typeof module.y === "number"
            && typeof module.rotation === "number"
            && module.connectors !== null
            && typeof module.connectors === "object";
    }

    return value.cardType === "event"
        && value.event !== null
        && typeof value.event === "object"
        && typeof value.event.id === "number";
}

function isLocation(value: any): value is CardLocation {
    if (value === null || typeof value !== "object") {
        return false;
    }

    if (value.type === "hand") {
        return typeof value.index === "number";
    }

    if (value.type === "chunk") {
        return typeof value.chunk === "number";
    }

    return value.type === "drag";
}

/** Returns the stored board, or undefined if there is nothing here we can safely use. */
export function deserialize(stored: string | null): Board | undefined {
    if (!stored) {
        return undefined;
    }

    try {
        const state = JSON.parse(stored) as PersistedBoard;

        if (state === null || typeof state !== "object" || state.version !== VERSION) {
            return undefined;
        }

        if (!Array.isArray(state.chunks) || !Array.isArray(state.cards)) {
            return undefined;
        }

        const board = new Board(state.thisPlayer);
        board.setCanRebuild(state.canRebuild === true);

        for (const chunk of state.chunks) {
            if (typeof chunk?.id !== "number" || !isVector(chunk.position)) {
                return undefined;
            }

            board.adoptChunk({
                id: chunk.id,
                owner: chunk.owner,
                position: chunk.position,
                activatedProtector: chunk.activatedProtector
            });
        }

        const seen = new Set<number>();

        for (const entry of state.cards) {
            if (!isCard(entry?.card) || !isLocation(entry.location)) {
                return undefined;
            }

            const id = CardGetters.id(entry.card);

            if (seen.has(id)) {
                return undefined;
            }

            seen.add(id);

            // a card in flight when the tab closed is simply back in the hand
            const location = entry.location.type === "drag"
                ? {type: "hand" as const, index: board.getHand().length}
                : entry.location;

            board.addCard(entry.card, location);
        }

        // stored hand indices might be anything; keep their order but make them contiguous again
        board.getHand().forEach((info, index) => board.insertIntoHand(CardGetters.id(info.card), index));

        // reconcile assumes a board that holds together, so anything that does not is not usable —
        // and a fresh board loses nothing but the arrangement
        if (validateBoard(board).length > 0) {
            return undefined;
        }

        return board;
    } catch {
        return undefined;
    }
}
