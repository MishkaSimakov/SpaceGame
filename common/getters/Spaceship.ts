import {MainModule, MainModuleType} from "../modules/MainModule";
import Module, {ModuleTypes} from "../modules/Module";
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

function getMainModule(ship: Spaceship): MainModule {
    let filtered = getModulesByType(ship, ModuleTypes.MainModule);

    if (!filtered.length)
        return undefined;

    return filtered[0] as MainModule;
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
    if (ship.modules.indexOf(module) !== -1 && x === undefined && y === undefined) {
        x = module.x;
        y = module.y;
    } else if (getModuleByPosition(ship, x, y))
        return false;

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

    return hasConnection || module.isMain;
}

function getConnectorInDirection(module: Module, direction: string): number {
    let directions = ["right", "top", "left", "bottom"];

    let index = directions.indexOf(direction);

    index = (index + module.rotation) % 4;

    return module.connectors[directions[index]];
}

function getModuleByPosition(ship: Spaceship, x: number, y: number);
function getModuleByPosition(ship: Spaceship, position: Vector2);
function getModuleByPosition(ship: Spaceship, x: (number | Vector2), y?: number): Module {
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

function getModulesByType(ship: Spaceship, type: ModuleTypes): Module[] {
    return ship.modules.filter((m) => m.type === type);
}

function canAttack(ship: Spaceship): boolean {
    return getModulesByType(ship, ModuleTypes.AttackModule).length !== 0;
}

function hasWeapon(ship: Spaceship): boolean {
    for (let module of ship.modules) {
        if (module.strength > 0)
            return true;
    }

    return false;
}

function hasProtectors(ship: Spaceship): boolean {
    return getModulesByType(ship, ModuleTypes.SmallQuantumProtector).length !== 0
        || getModulesByType(ship, ModuleTypes.QuantumProtector).length !== 0;
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
    return getModulesByType(ship, ModuleTypes.RepairModule).length !== 0;
}

function checkConfiguration(ship: Spaceship): boolean {
    for (let module of ship.modules) {
        if (!canConnectModule(ship, module))
            return false;
    }

    return true;
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
    canAttack,
    hasWeapon,
    hasProtectors,
    hasDamagedModules,
    getUnconnectedModules,
    hasRepairModule,
    checkConfiguration
};