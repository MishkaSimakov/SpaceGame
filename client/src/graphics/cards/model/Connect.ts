import {ModuleCard, Spaceship, Vector2} from "@common/Types";
import {directions, SpaceshipGetters} from "@common/getters/Spaceship";
import {getDistance} from "@common/helpers/Vector";

import {ChunkId} from "./Chunk";

/**
 * Snap-and-connect geometry.
 *
 * Everything here is pure and works in **card units** — one unit is one module, so a distance of
 * 1 means "one module apart". The thresholds below are in those units and are what give dragging
 * its feel; the view scales by its card size and never passes pixels in here.
 */

/** A drag chunk gets pulled onto a neighbour once a module comes this close to a free slot. */
export const CONNECT_DISTANCE = 0.25;

/** Once snapped, further chunks join only if they line up much more precisely than that. */
export const CLOSE_CONNECT_DISTANCE = 0.1;

/** A single dragged module starts turning to fit while still this far out. */
export const AUTOROTATE_DISTANCE = 0.5;

/** A chunk considered as a connection candidate, in world (card-unit) coordinates. */
export type ChunkView = {
    id: ChunkId,
    position: Vector2,
    spaceship: Spaceship
};

/**
 * A found join: `chunk` will be merged in, with its modules shifted by `offset` into the
 * dragged chunk's coordinate frame.
 */
export type ConnectionPoint = {
    chunk: ChunkId,
    offset: Vector2
};

export function mergeSpaceships(...parts: { spaceship: Spaceship, offset: Vector2 }[]): Spaceship {
    const result: ModuleCard[] = [];

    for (const part of parts) {
        for (const module of part.spaceship.modules) {
            const copy = structuredClone(module);
            copy.x += part.offset.x;
            copy.y += part.offset.y;

            result.push(copy);
        }
    }

    return {modules: result};
}

/** World position of a module sitting in a chunk. */
export function moduleWorldPosition(chunk: ChunkView, module: ModuleCard): Vector2 {
    return {
        x: chunk.position.x + module.x,
        y: chunk.position.y + module.y
    };
}

/**
 * The grid slot of `chunk` nearest to a world point, and how far off it is.
 * Distance is in card units, so it is directly comparable to the thresholds above.
 */
export function getClosestModulePosition(chunk: ChunkView, worldPosition: Vector2): {
    position: Vector2,
    distance: number
} {
    const relative = {
        x: worldPosition.x - chunk.position.x,
        y: worldPosition.y - chunk.position.y
    };

    const closest = {
        x: Math.round(relative.x),
        y: Math.round(relative.y)
    };

    return {position: closest, distance: getDistance(relative, closest)};
}

/** True if any two adjacent modules present mismatched connectors. */
export function hasBadConnection(ship: Spaceship): boolean {
    for (const module of ship.modules) {
        for (const [key, value] of Object.entries(directions)) {
            const moduleInDirection = SpaceshipGetters.getModuleByPosition(ship, module.x + value.x, module.y + value.y);

            if (!moduleInDirection) {
                continue;
            }

            if (SpaceshipGetters.getConnectorInDirection(module, key) !== SpaceshipGetters.getConnectorInDirection(moduleInDirection, value.opposite)) {
                return true;
            }
        }
    }

    return false;
}

/** The rotation the module would need at `position`, or undefined if it cannot fit there at all. */
export function getFeasibleModuleRotation(spaceship: Spaceship, module: ModuleCard, position: Vector2): number | undefined {
    if (SpaceshipGetters.canConnectModule(spaceship, module, position.x, position.y)) {
        return module.rotation;
    }

    return SpaceshipGetters.getPossibleRotationsFor(spaceship, module, position.x, position.y)[0];
}

/**
 * The rotation a single dragged module should auto-turn to, if it is near enough to a candidate
 * chunk to start fitting itself. Returns undefined when nothing is in range.
 */
export function getAutorotateTarget(
    module: ModuleCard,
    moduleWorld: Vector2,
    candidates: ChunkView[]
): { chunk: ChunkId, position: Vector2, rotation: number } | undefined {
    for (const candidate of candidates) {
        const closest = getClosestModulePosition(candidate, moduleWorld);

        if (closest.distance >= AUTOROTATE_DISTANCE) {
            continue;
        }

        const rotation = getFeasibleModuleRotation(candidate.spaceship, module, closest.position);

        if (rotation !== undefined) {
            return {chunk: candidate.id, position: closest.position, rotation};
        }
    }

    return undefined;
}

/**
 * Which chunks the dragged chunk should snap onto, in its own coordinate frame.
 *
 * Two passes. The first finds a single *primary* join, at the generous CONNECT_DISTANCE — this is
 * the join the player is aiming for. The second assumes that snap has happened and picks up any
 * further chunks that then line up, at the much tighter CLOSE_CONNECT_DISTANCE: those joins are
 * incidental, so they must be nearly exact rather than merely close. If a secondary candidate
 * would put mismatched connectors anywhere in the merged ship, the whole set is rejected —
 * snapping into an illegal ship is worse than not snapping.
 */
export function getConnectionPoints(dragged: ChunkView, candidates: ChunkView[]): ConnectionPoint[] {
    const spaceship = dragged.spaceship;

    let primary: ConnectionPoint | undefined = undefined;

    for (const candidate of candidates) {
        if (candidate.id === dragged.id) {
            continue;
        }

        for (const module of spaceship.modules) {
            const closest = getClosestModulePosition(candidate, moduleWorldPosition(dragged, module));

            if (closest.distance >= CONNECT_DISTANCE) {
                continue;
            }

            const connectionPoint: ConnectionPoint = {
                chunk: candidate.id,
                offset: {
                    x: module.x - closest.position.x,
                    y: module.y - closest.position.y
                }
            };

            const merged = mergeSpaceships(
                {spaceship, offset: {x: 0, y: 0}},
                {spaceship: candidate.spaceship, offset: connectionPoint.offset}
            );

            if (SpaceshipGetters.checkConfiguration(merged, false)) {
                primary = connectionPoint;
                break;
            }
        }

        if (primary !== undefined) {
            break;
        }
    }

    if (primary === undefined) {
        return [];
    }

    const primaryChunk = candidates.find(c => c.id === primary!.chunk)!;
    const connectionPoints: ConnectionPoint[] = [primary];

    for (const candidate of candidates) {
        if (candidate.id === primary.chunk || candidate.id === dragged.id) {
            continue;
        }

        for (const module of spaceship.modules) {
            // where this module will sit once the primary snap is applied
            const snappedWorld = {
                x: primaryChunk.position.x + module.x - primary.offset.x,
                y: primaryChunk.position.y + module.y - primary.offset.y
            };

            const closest = getClosestModulePosition(candidate, snappedWorld);

            if (closest.distance >= CLOSE_CONNECT_DISTANCE) {
                continue;
            }

            const connectionPoint: ConnectionPoint = {
                chunk: candidate.id,
                offset: {
                    x: module.x - closest.position.x,
                    y: module.y - closest.position.y
                }
            };

            const merged = mergeSpaceships(
                {spaceship, offset: {x: 0, y: 0}},
                ...connectionPoints.map(cp => ({
                    spaceship: candidates.find(c => c.id === cp.chunk)!.spaceship,
                    offset: cp.offset
                })),
                {spaceship: candidate.spaceship, offset: connectionPoint.offset}
            );

            if (hasBadConnection(merged)) {
                return [];
            }

            if (SpaceshipGetters.checkConfiguration(merged, false)) {
                connectionPoints.push(connectionPoint);
                break;
            }
        }
    }

    return connectionPoints;
}

/** Where the dragged chunk lands once `primary` is applied. */
export function snappedChunkPosition(primaryChunk: ChunkView, primary: ConnectionPoint): Vector2 {
    return {
        x: primaryChunk.position.x - primary.offset.x,
        y: primaryChunk.position.y - primary.offset.y
    };
}
