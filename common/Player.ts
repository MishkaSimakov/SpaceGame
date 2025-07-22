import Spaceship from "./Spaceship";
import Module, {isModule, ModuleTypes} from "./modules/Module";
import {Event} from "./events/Event";
import {Options} from "./PlainToClass";
import {OtherPlayer} from "./GameForPlayerDTO";

export type PlayerId = number;

export default class Player {
    id: PlayerId;
    name: string;

    socketId: string;

    spaceship: Spaceship;
    hand: (Module | Event)[] = [];

    energy: number = 0;
    skipNextTurn: boolean;

    online: boolean;

    usedRepairOrAttackModuleSecondTimeOnThisTurn: boolean = false;

    lose: boolean = false;

    canDamage(): boolean {
        let weaponCost = this.spaceship.modules.filter(m => m.strength > 0).map(m => m.energyCost);

        if (weaponCost.length === 0)
            return false;

        return Math.min(...weaponCost) <= this.energy;
    }

    canProtect(): boolean {
        let protectorCost = this.spaceship.modules.filter(m => m.type === ModuleTypes.QuantumProtector || m.type === ModuleTypes.SmallQuantumProtector)
            .map(m => m.energyCost);

        if (protectorCost.length === 0)
            return false;

        return Math.min(...protectorCost) <= this.energy;
    }

    static getPropertiesMap(): Options {
        return {
            class: Player,

            spaceship: {
                class: Spaceship,

                modules: {
                    class: Module
                }
            },
            hand: {
                classifier: (plain) => {
                    if (isModule(plain)) {
                        return Module;
                    } else {
                        return Event;
                    }
                }
            }
        };
    }

    setLose() {
        this.lose = true;
    }

    isLose(): boolean {
        return this.lose;
    }
}
