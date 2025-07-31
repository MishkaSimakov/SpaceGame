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

function removeModule(ship: Spaceship, x: number, y: number);
function removeModule(ship: Spaceship, module: Module);
function removeModule(ship: Spaceship, module: Module[]);
function removeModule(ship: Spaceship, x: number | Module | Module[], y?: number) {
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


function damageModule(ship: Spaceship, target: Module, weapon: Module, byNuclearReactor: boolean)
function damageModule(ship: Spaceship, target: Module, weapon: number, byNuclearReactor: boolean)
function damageModule(ship: Spaceship, target: Module, weapon: Module | number, byNuclearReactor: boolean): {
    module: Module,
    byNuclearReactor: boolean
}[] {
    let damage: number;
    if (typeof weapon == "number") {
        damage = weapon;
    } else {
        damage = weapon.strength;
    }

    let destroyed: {
        module: Module,
        byNuclearReactor: boolean
    }[] = [];

    if (ship.activatedProtector && SpaceshipGetters.isAdjacent(ship, target, ship.activatedProtector)) {
        if (ship.activatedProtector.health > damage) {
            ship.activatedProtector.health -= damage;

            return;
        } else {
            damage -= ship.activatedProtector.health;

            destroyed.push({
                module: ship.activatedProtector,
                byNuclearReactor: byNuclearReactor
            });

            ship.activatedProtector = undefined;
        }
    }

    target.health -= damage;

    if (target.health <= 0) {
        destroyed.push({
            module: target,
            byNuclearReactor: byNuclearReactor
        });

        if (target.type === ModuleType.NuclearReactor) {
            for (let module of SpaceshipGetters.getModulesConnectedTo(ship, target)) {
                // handle loop made of nuclear reactors (only one damage to all connected modules)
                if (destroyed.filter((d) => d.module === module).length)
                    continue;

                destroyed.push(
                    ...damageModule(ship, module, 1, true)
                );
            }
        }
    }

    return destroyed;
}

function setProtector(ship: Spaceship, protector: Module) {
    if (protector.type !== ModuleType.SmallQuantumProtector && protector.type !== ModuleType.QuantumProtector)
        throw new Error('Set protector called but module is not protector');

    ship.activatedProtector = protector;
}

export const SpaceshipModifiers = {
    addModule,
    removeModule,
    damageModule,
    setProtector
}