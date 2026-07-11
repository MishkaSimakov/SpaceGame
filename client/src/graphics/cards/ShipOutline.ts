import {Spaceship, Vector2} from "@common/Types";
import {Direction, directions, SpaceshipGetters} from "@common/getters/Spaceship";
import {ModuleGetters} from "@common/getters/Module";

const directionsArray: Direction[] = ["right", "bottom", "left", "top"];

// right  -> 0,0   -> bottom
// bottom -> -1,0  -> left
// left   -> -1,-1 -> top
// top    -> 0,-1  -> right

// right  -> 0,-1  -> right
// bottom -> 0,0   -> bottom
// left   -> -1,0  -> left
// top    -> -1,-1 -> top

// otherwise:
// right  -> top
// bottom -> right
// left   -> bottom
// top    -> left

enum PointType {
    CONVEX,
    CONCAVE,
    STRAIGHT
}

function getTraverseDirection(ship: Spaceship, point: Vector2, prevDirection: Direction): PointType {
    const offsets: Record<Direction, Vector2> = {
        "right": {x: 0, y: 0},
        "bottom": {x: -1, y: 0},
        "left": {x: -1, y: -1},
        "top": {x: 0, y: -1},
    };

    const prevIndex = directionsArray.indexOf(prevDirection);

    const firstPosition = {
        x: point.x + offsets[prevDirection].x,
        y: point.y + offsets[prevDirection].y,
    };
    if (SpaceshipGetters.getModuleByPosition(ship, firstPosition) !== undefined) {
        return PointType.CONCAVE;
    }

    const secondPosition = {
        x: point.x + offsets[directionsArray[(prevIndex + 3) % 4]].x,
        y: point.y + offsets[directionsArray[(prevIndex + 3) % 4]].y,
    };
    if (SpaceshipGetters.getModuleByPosition(ship, secondPosition) !== undefined) {
        return PointType.STRAIGHT;
    }

    return PointType.CONVEX;
}

function traverseInterpoints(ship: Spaceship, startPoint: Vector2, prevDirection: Direction, padding: number): {
    path: Vector2[],
    visited: { point: Vector2, direction: Direction }[]
} {
    const path: Vector2[] = [];
    const visited: { point: Vector2, direction: Direction }[] = [];

    let currentDirection = prevDirection;
    let currentPoint = startPoint;

    while (true) {
        const pointType = getTraverseDirection(ship, currentPoint, currentDirection);

        const directionShifts = {
            [PointType.CONCAVE]: 1,
            [PointType.STRAIGHT]: 0,
            [PointType.CONVEX]: 3
        };
        const currentDirectionIndex = directionsArray.indexOf(currentDirection);
        const nextDirection = directionsArray[(currentDirectionIndex + directionShifts[pointType]) % 4];

        const nextPoint = {
            x: currentPoint.x + directions[nextDirection].x,
            y: currentPoint.y + directions[nextDirection].y,
        };

        visited.push({point: nextPoint, direction: nextDirection});

        if (pointType === PointType.CONCAVE) {
            path.push({
                x: currentPoint.x + (directions[nextDirection].x - directions[currentDirection].x) * padding,
                y: currentPoint.y + (directions[nextDirection].y - directions[currentDirection].y) * padding
            });
        } else if (pointType === PointType.CONVEX) {
            path.push({
                x: currentPoint.x + (directions[currentDirection].x - directions[nextDirection].x) * padding,
                y: currentPoint.y + (directions[currentDirection].y - directions[nextDirection].y) * padding
            });
        }

        if (nextPoint.x === startPoint.x && nextPoint.y === startPoint.y) {
            break;
        }

        currentPoint = nextPoint;
        currentDirection = nextDirection;
    }

    return {path, visited};
}

function encodeVisited({point, direction}: { point: Vector2, direction: Direction }): string {
    return `${point.x};${point.y};${direction}`;
}

export function getSpaceshipOutline(ship: Spaceship, padding: number): Vector2[][] {
    const result: Vector2[][] = [];

    const visitedPoints = new Set<string>();

    for (const module of ship.modules) {
        for (const direction of directionsArray) {
            const neighbourPosition = {
                x: module.x + directions[direction].x,
                y: module.y + directions[direction].y,
            };

            if (SpaceshipGetters.getModuleByPosition(ship, neighbourPosition) !== undefined) {
                continue;
            }

            const interpointOffset: Record<Direction, Vector2> = {
                "right": {x: 1, y: 0},
                "bottom": {x: 1, y: 1},
                "left": {x: 0, y: 1},
                "top": {x: 0, y: 0},
            };

            const interpointPosition = ModuleGetters.position(module);
            interpointPosition.x += interpointOffset[direction].x;
            interpointPosition.y += interpointOffset[direction].y;

            const prevDirection = directionsArray[(directionsArray.indexOf(direction) + 3) % 4];

            if (!visitedPoints.has(encodeVisited({point: interpointPosition, direction: prevDirection}))) {
                const {path, visited} = traverseInterpoints(ship, interpointPosition, prevDirection, padding);
                result.push(path);
                visited.map(encodeVisited).forEach(v => visitedPoints.add(v));
            }
        }
    }

    return result;
}