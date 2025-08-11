import {MainModule, MainModuleType} from "../modules/MainModule";
import Module, {isMainModule, ModuleType} from "../modules/Module";
import Vector2 from "../Vector2";
import Spaceship from "../Spaceship";

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

function getMainModule(ship: Spaceship): MainModule | undefined {
    let filtered = getModulesByType(ship, ModuleType.MainModule);

    if (filtered.length === 0) {
        return undefined;
    }

    return filtered[0] as unknown as MainModule;
}

function getMainModuleType(ship: Spaceship): MainModuleType {
    return (getMainModule(ship) as MainModule)?.mainModuleType;
}

function getTotalCapacity(ship: Spaceship): number {
    return ship.modules.reduce((ps, card) => ps + card.capacity, 0);
}

function getTotalEnergyIncrease(ship: Spaceship): number {
    return ship.modules.reduce((ps, card) => ps + card.energyIncrease, 0);
}

function canConnectModule(ship: Spaceship, module: Module, x: number, y: number): boolean;
function canConnectModule(ship: Spaceship, module: Module): boolean;
function canConnectModule(ship: Spaceship, module: Module, x?: number, y?: number): boolean {
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

    return hasConnection || isMainModule(module);
}

function getConnectorInDirection(module: Module, direction: string): number {
    const directions = ["right", "top", "left", "bottom"];

    let index = directions.indexOf(direction);
    index = (index + module.rotation) % 4;

    return module.connectors[directions[index] as keyof typeof module.connectors];
}

function getModuleByPosition(ship: Spaceship, x: number, y: number): Module;
function getModuleByPosition(ship: Spaceship, position: Vector2): Module;
function getModuleByPosition(ship: Spaceship, x: (number | Vector2), y?: number): Module | undefined {
    if (typeof x == "number") {
        return ship.modules.filter(card => card.x === x && card.y === y)[0];
    } else if (x && x.x !== undefined && x.y !== undefined) {
        return ship.modules.filter(card => card.x === x.x && card.y === x.y)[0];
    }
}

function getPossibleConnectionsFor(ship: Spaceship, module: Module): number[][] {
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

function getPossibleRotationsFor(ship: Spaceship, module: Module, x: number, y: number): number[] {
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

function getModulesConnectedTo(ship: Spaceship, module: Module): Module[] {
    let connectedModules: Module[] = [];

    for (let [index, direction] of Object.entries(directions)) {
        if (!getModuleByPosition(ship, module.x + direction[0], module.y + direction[1]))
            continue;

        if (getConnectorInDirection(module, index) === 0)
            continue;

        connectedModules.push(getModuleByPosition(ship, module.x + direction[0], module.y + direction[1]));
    }

    return connectedModules;
}

function isAdjacent(ship: Spaceship, first: Module, second: Module) {
    for (let module of getModulesConnectedTo(ship, first)) {
        if (module === second)
            return true;
    }

    return false;
}

function getModulesByType(ship: Spaceship, type: ModuleType): Module[] {
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

function getUnconnectedModules(ship: Spaceship): Module[] {
    let unconnectedModules = ship.modules;

    let addedModules: Module[] = [getModuleByPosition(ship, 0, 0)];

    do {
        let newAddedModules = [];

        for (let module of addedModules) {
            unconnectedModules = unconnectedModules.filter(m => (m.x !== module.x || m.y !== module.y));

            newAddedModules.push(...getModulesConnectedTo(ship, module).filter(m => unconnectedModules.indexOf(m) !== -1));
        }

        addedModules = newAddedModules;
    } while (addedModules.length !== 0);

    return unconnectedModules;
}

function hasRepairModule(ship: Spaceship): boolean {
    return getModulesByType(ship, ModuleType.RepairModule).length !== 0;
}

function checkConfiguration(ship: Spaceship): boolean {
    for (let module of ship.modules) {
        if (!canConnectModule(ship, module))
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

    const targetModule = SpaceshipGetters.getModuleByPosition(shipCopy, target);

    if (shipCopy.activatedProtector && SpaceshipGetters.isAdjacent(shipCopy, targetModule, shipCopy.activatedProtector)) {
        const protectorPosition = new Vector2(shipCopy.activatedProtector.x, shipCopy.activatedProtector.y);

        if (shipCopy.activatedProtector.health > damage) {
            return {
                damaged: [{
                    position: protectorPosition,
                    damage: damage,
                }],
                destroyed: [],
                shouldDeactivateProtector: false
            };
        } else {
            damage -= shipCopy.activatedProtector.health;

            destroyed.set(`${shipCopy.activatedProtector.x},${shipCopy.activatedProtector.y}`, byNuclearReactor);

            shipCopy.activatedProtector = undefined;
            shouldDeactivateProtector = true;
        }
    }

    const targetKey = `${target.x},${target.y}`;
    const targetDamage = damaged.get(targetKey) ?? 0;
    damaged.set(targetKey, targetDamage + damage);
    targetModule.health -= damage;

    console.log(damaged, destroyed);

    if (targetModule.health <= 0) {
        damaged.delete(targetKey);
        destroyed.set(targetKey, byNuclearReactor);

        if (targetModule.type === ModuleType.NuclearReactor) {
            for (let module of SpaceshipGetters.getModulesConnectedTo(shipCopy, targetModule)) {
                const position = new Vector2(module.x, module.y);
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
            return {position: new Vector2(x, y), byNuclearReactor: b};
        }),

        damaged: Array.from(damaged).map(([p, d]) => {
            const [x, y] = p.split(',').map(Number);
            return {position: new Vector2(x, y), damage: d};
        }),

        shouldDeactivateProtector
    };
}

function damageInfo(ship: Spaceship, target: Module, damage: number) {
    const shipCopy = structuredClone(ship);
    return damageInfoInternal(
        shipCopy,
        new Vector2(target.x, target.y),
        damage,
        false,
        new Map<string, number>(),
        new Map<string, boolean>()
    );
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
    damageInfo
};