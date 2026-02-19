import {SpaceshipGetters} from "../getters/Spaceship";
import {ModuleCard, ModuleType, Spaceship, Vector2} from "../Types";

function addModule(ship: Spaceship, module: ModuleCard, position: Vector2): boolean;
function addModule(ship: Spaceship, module: ModuleCard, x: number, y: number): boolean;
function addModule(ship: Spaceship, module: ModuleCard, x: number | Vector2, y?: number): boolean {
    if (typeof x !== "number") {
        y = x.y;
        x = x.x;
    }

    if (!SpaceshipGetters.canConnectModule(ship, module, x, y!)) {
        return false;
    }

    module.x = x;
    module.y = y!;
    ship.modules.push(module);

    return true;
}

function removeModule(ship: Spaceship, x: number, y: number): boolean;
function removeModule(ship: Spaceship, module: ModuleCard): boolean;
function removeModule(ship: Spaceship, module: ModuleCard[]): boolean;
function removeModule(ship: Spaceship, x: number | ModuleCard | ModuleCard[], y?: number): boolean {
    const initialModulesCount = ship.modules.length;

    if (typeof x === 'number') {
        ship.modules = ship.modules.filter(card => (card.x !== x || card.y !== y));
    } else if (Array.isArray(x)) {
        x.forEach(m => removeModule(ship, m));
    } else {
        removeModule(ship, x.x, x.y);
    }

    return ship.modules.length !== initialModulesCount;
}

function setProtector(ship: Spaceship, protector: ModuleCard) {
    if (protector.type !== ModuleType.SmallQuantumProtector && protector.type !== ModuleType.QuantumProtector)
        throw new Error('Set protector called but module is not protector');

    ship.activatedProtector = protector;
}

export const SpaceshipModifiers = {
    addModule,
    removeModule,
    setProtector
}