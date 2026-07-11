import {PlayerId, Vector2} from "@common/Types";

export type ChunkId = number;

/**
 * A connected group of module cards on the field. Every module on the field belongs to exactly
 * one chunk; the chunk holding a player's command module is their actual ship.
 *
 * Carries no graphics: the view holds the shapes and finds them again by `id`.
 *
 * `position` is in **card units**, not pixels — one unit is one module. This is what lets the
 * connection geometry in Connect.ts compare distances against its thresholds without knowing
 * anything about the screen.
 */
export type Chunk = {
    id: ChunkId,
    owner: PlayerId,
    position: Vector2,
    activatedProtector: Vector2 | undefined
};
