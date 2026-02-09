import {MainModuleType, ModuleCard, ModuleType, Spaceship, Vector2} from "../Types";
import {ModuleGetters} from "./Module";

type Direction = "left" | "top" | "right" | "bottom";

const directions: Record<string, [number, number]> = {
    'left': [-1, 0],
    'top': [0, -1],
    'right': [1, 0],
    'bottom': [0, 1]
}

const opposites: Record<string, string> = {
    'left': 'right',
    'top': 'bottom',
    'right': 'left',
    'bottom': 'top'
}

function getMainModule(ship: Spaceship): ModuleCard | undefined {
    return getModulesByType(ship, ModuleType.MainModule)[0];
}

function getMainModuleType(ship: Spaceship): MainModuleType | undefined {
    return getMainModule(ship)?.mainModuleType;
}

function getTotalCapacity(ship: Spaceship): number {
    return ship.modules.reduce((ps, card) => ps + card.capacity, 0);
}

function getTotalEnergyIncrease(ship: Spaceship): number {
    return ship.modules.reduce((ps, card) => ps + card.energyIncrease, 0);
}

function canConnectModule(ship: Spaceship, module: ModuleCard, x: number, y: number): boolean;
function canConnectModule(ship: Spaceship, module: ModuleCard): boolean;
function canConnectModule(ship: Spaceship, module: ModuleCard, x?: number, y?: number): boolean {
    if (ship.modules.length === 0) {
        return true;
    }

    if (x === undefined || y === undefined) {
        x = module.x;
        y = module.y;
    } else if (getModuleByPosition(ship, x, y)) {
        return false;
    }

    let hasConnection = false;

    for (let [key, value] of Object.entries(directions)) {
        let module_in_direction = getModuleByPosition(ship, x + value[0], y + value[1]);

        if (!module_in_direction) continue;

        if (getConnectorInDirection(module, key) !== getConnectorInDirection(module_in_direction, opposites[key])) {
            return false;
        }

        if (getConnectorInDirection(module, key) !== 0)
            hasConnection = true;
    }

    return hasConnection || ModuleGetters.isMain(module);
}

function getConnectorInDirection(module: ModuleCard, direction: string): number {
    const directions = ["right", "top", "left", "bottom"];

    let index = directions.indexOf(direction);
    index = (index + module.rotation) % 4;

    return module.connectors[directions[index] as keyof typeof module.connectors];
}

function getModuleByPosition(ship: Spaceship, x: number, y: number): ModuleCard | undefined;
function getModuleByPosition(ship: Spaceship, position: Vector2): ModuleCard | undefined;
function getModuleByPosition(ship: Spaceship, x: (number | Vector2), y?: number): ModuleCard | undefined {
    if (typeof x == "number") {
        return ship.modules.filter(card => card.x === x && card.y === y)[0];
    } else if (x && x.x !== undefined && x.y !== undefined) {
        return ship.modules.filter(card => card.x === x.x && card.y === x.y)[0];
    }
}

function getPossibleConnectionsFor(ship: Spaceship, module: ModuleCard): number[][] {
    let possible_connections = []

    for (let i in ship.modules) {
        let spaceship_module = ship.modules[i];
        for (let direction in directions) {
            const x = spaceship_module.x + directions[direction][0];
            const y = spaceship_module.y + directions[direction][1];

            if (!getModuleByPosition(ship, x, y) && canConnectModule(ship, module, x, y)) {
                possible_connections.push([x, y]);
            }
        }
    }

    return possible_connections;
}

function getPossibleRotationsFor(ship: Spaceship, module: ModuleCard, x: number, y: number): number[] {
    const initRotation = module.rotation;
    let possibleRotations = [];

    for (let i = 0; i < 4; ++i) {
        module.rotation = i;

        if (canConnectModule(ship, module, x, y))
            possibleRotations.push(i);
    }

    module.rotation = initRotation;

    return possibleRotations;
}

function getModulesConnectedTo(ship: Spaceship, module: ModuleCard) {
    let connectedModules: {
        [Key in Direction]?: ModuleCard
    } = {};

    for (let [index, direction] of Object.entries(directions)) {
        if (getConnectorInDirection(module, index) === 0) {
            continue;
        }

        const moduleInDirection = getModuleByPosition(ship, module.x + direction[0], module.y + direction[1]);

        if (moduleInDirection) {
            connectedModules[index as Direction] = moduleInDirection;
        }
    }

    return connectedModules;
}

function isAdjacent(ship: Spaceship, first: ModuleCard, second: ModuleCard) {
    for (let module of Object.values(getModulesConnectedTo(ship, first))) {
        if (module === second) {
            return true;
        }
    }

    return false;
}

function getModulesByType(ship: Spaceship, type: ModuleType): ModuleCard[] {
    return ship.modules.filter((m) => m.type === type);
}

function hasWeapon(ship: Spaceship): boolean {
    for (let module of ship.modules) {
        if (module.strength > 0)
            return true;
    }

    return false;
}

function hasProtectors(ship: Spaceship): boolean {
    return getModulesByType(ship, ModuleType.SmallQuantumProtector).length !== 0
        || getModulesByType(ship, ModuleType.QuantumProtector).length !== 0;
}

function hasDamagedModules(ship: Spaceship): boolean {
    for (let module of ship.modules) {
        if (module.health != module.totalHealth) {
            return true;
        }
    }

    return false;
}

function getUnconnectedModules(ship: Spaceship): ModuleCard[] {
    const mainModule = getMainModule(ship);

    if (!mainModule) {
        return ship.modules;
    }

    const connected = getConnectedModules(ship, mainModule).map(m => m.id);
    return ship.modules.filter(m => !connected.includes(m.id));
}

function hasRepairModule(ship: Spaceship): boolean {
    return getModulesByType(ship, ModuleType.RepairModule).length !== 0;
}

function checkConfiguration(ship: Spaceship, mustContainMain: boolean = true): boolean {
    // check that all positions are different
    const positions = ship.modules
        .map(module => `${module.x},${module.y}`);

    if (new Set(positions).size !== positions.length) {
        return false;
    }

    // check all connections
    for (let module of ship.modules) {
        if (!canConnectModule(ship, module)) {
            return false;
        }
    }

    // check that all modules are connected
    if (getComponents(ship).length > 1) {
        return false;
    }

    if (mustContainMain && getMainModule(ship) === undefined) {
        return false;
    }

    return true;
}

export type DamageInfo = {
    damaged: {
        position: Vector2,
        damage: number
    }[],
    destroyed: {
        position: Vector2,
        byNuclearReactor: boolean
    }[],
    shouldDeactivateProtector: boolean
};

function damageInfoInternal(
    shipCopy: Spaceship,
    target: Vector2,
    damage: number,
    byNuclearReactor: boolean,
    damaged: Map<string, number>,
    destroyed: Map<string, boolean>
): DamageInfo {
    let shouldDeactivateProtector = false;

    const targetModule = SpaceshipGetters.getModuleByPosition(shipCopy, target)!;
    const activatedProtector = shipCopy.activatedProtector
        ? SpaceshipGetters.getModuleByPosition(shipCopy, shipCopy.activatedProtector)
        : undefined;

    if (activatedProtector && SpaceshipGetters.isAdjacent(shipCopy, targetModule, activatedProtector)) {
        if (activatedProtector.health > damage) {
            return {
                damaged: [{
                    position: {
                        x: activatedProtector.x,
                        y: activatedProtector.y
                    },
                    damage: damage,
                }],
                destroyed: [],
                shouldDeactivateProtector: false
            };
        } else {
            damage -= activatedProtector.health;

            destroyed.set(`${activatedProtector.x},${activatedProtector.y}`, byNuclearReactor);

            shipCopy.activatedProtector = undefined;
            shouldDeactivateProtector = true;
        }
    }

    const targetKey = `${target.x},${target.y}`;
    const targetDamage = damaged.get(targetKey) ?? 0;
    damaged.set(targetKey, targetDamage + damage);
    targetModule.health -= damage;

    if (targetModule.health <= 0) {
        damaged.delete(targetKey);
        destroyed.set(targetKey, byNuclearReactor);

        if (targetModule.type === ModuleType.NuclearReactor) {
            for (let module of Object.values(SpaceshipGetters.getModulesConnectedTo(shipCopy, targetModule))) {
                const position = {x: module.x, y: module.y};
                // handle loop made of nuclear reactors (only one damage to all connected modules)
                if (destroyed.has(`${position.x},${position.y}`))
                    continue;

                const info = damageInfoInternal(shipCopy, position, 1, true, damaged, destroyed);
                shouldDeactivateProtector = shouldDeactivateProtector || info.shouldDeactivateProtector;
            }
        }
    }

    return {
        destroyed: Array.from(destroyed).map(([p, b]) => {
            const [x, y] = p.split(',').map(Number);
            return {position: {x, y}, byNuclearReactor: b};
        }),

        damaged: Array.from(damaged).map(([p, d]) => {
            const [x, y] = p.split(',').map(Number);
            return {position: {x, y}, damage: d};
        }),

        shouldDeactivateProtector
    };
}

function damageInfo(ship: Spaceship, target: ModuleCard, damage: number) {
    const shipCopy = structuredClone(ship);
    return damageInfoInternal(
        shipCopy,
        {x: target.x, y: target.y},
        damage,
        false,
        new Map<string, number>(),
        new Map<string, boolean>()
    );
}

function mapForRebuildSpaceshipResponse(ship: Spaceship) {
    return ship.modules.map(module => ({
        id: module.id,
        position: {x: module.x, y: module.y},
        rotation: module.rotation
    }));
}

function getConnectedModules(ship: Spaceship, origin: ModuleCard) {
    const result: ModuleCard[] = [origin];

    let prevAddedModules = [origin];
    let newAddedModules = [];

    do {
        newAddedModules = [];

        for (const module of prevAddedModules) {
            const newConnected = Object.values(getModulesConnectedTo(ship, module))
                .filter(m => !result.map(r => r.id).includes(m.id))

            result.push(...newConnected);
            newAddedModules.push(...newConnected);
        }

        prevAddedModules = newAddedModules;
        newAddedModules = [];
    } while (prevAddedModules.length !== 0);

    return result;
}

function getComponents(ship: Spaceship): Spaceship[] {
    const visitedModules: number[] = []
    const components: Spaceship[] = [];

    for (const module of ship.modules) {
        if (!visitedModules.includes(module.id)) {
            const component = getConnectedModules(ship, module);

            visitedModules.push(...component.map(m => m.id));
            components.push({modules: component});
        }
    }

    return components;
}

export const SpaceshipGetters = {
    getMainModule,
    getMainModuleType,
    getTotalCapacity,
    getTotalEnergyIncrease,
    canConnectModule,
    getConnectorInDirection,
    getModuleByPosition,
    getPossibleConnectionsFor,
    getPossibleRotationsFor,
    getModulesConnectedTo,
    isAdjacent,
    getModulesByType,
    hasWeapon,
    hasProtectors,
    hasDamagedModules,
    getUnconnectedModules,
    hasRepairModule,
    checkConfiguration,
    damageInfo,
    mapForRebuildSpaceshipResponse,
    getConnectedModules,
    getComponents,
};