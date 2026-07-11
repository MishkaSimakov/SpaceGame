import {Card} from "@common/Types";

import {ChunkId} from "./Chunk";

/**
 * Where a card is.
 *
 * `hand` carries its own `index` because hand order is player-visible and reorderable, so it is
 * part of the state — and this is the only place it is kept. Indices are contiguous (0..n-1);
 * `Board.reindexHand` restores that after every hand mutation.
 *
 * `drag` is transient: the card has been lifted out of the hand but not yet dropped anywhere. A
 * module being dragged across the field is not in this state — it lives in a chunk of its own.
 */
export type CardLocation =
    { type: "hand", index: number }
    | { type: "chunk", chunk: ChunkId }
    | { type: "drag" };

/**
 * A card and where it sits. Carries no graphics: the view holds the shape and finds it again by
 * card id.
 *
 * For a module, its in-chunk coordinates and rotation live on `card.module` (`x`, `y`,
 * `rotation`), the same fields the server uses — the model does not duplicate them.
 */
export type CardInfo = {
    card: Card,
    location: CardLocation
};
