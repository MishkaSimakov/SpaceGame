import Spaceship from "../Spaceship";
import Module, {ModuleType} from "../modules/Module";
import {SpaceshipGetters} from "../getters/Spaceship";

function addModule(ship: Spaceship, module: Module, x: number, y: number): boolean {
    if (!SpaceshipGetters.canConnectModule(ship, module, x, y)) {
        return false;
    }

    module.x = x;
    module.y = y;
    ship.modules.push(module);

    return true;
}

function removeModule(ship: Spaceship, x: number, y: number): void;
function removeModule(ship: Spaceship, module: Module): void;
function removeModule(ship: Spaceship, module: Module[]): void;
function removeModule(ship: Spaceship, x: number | Module | Module[], y?: number): void {
    if (typeof x === 'number') {
        ship.modules = ship.modules.filter(card => (card.x !== x || card.y !== y));

        return;
    } else if (Array.isArray(x)) {
        for (let m of x)
            removeModule(ship, m);

        return;
    }

    removeModule(ship, x.x, x.y);
}

function setProtector(ship: Spaceship, protector: Module) {
    if (protector.type !== ModuleType.SmallQuantumProtector && protector.type !== ModuleType.QuantumProtector)
        throw new Error('Set protector called but module is not protector');

    ship.activatedProtector = protector;
}

export const SpaceshipModifiers = {
    addModule,
    removeModule,
    setProtector
}