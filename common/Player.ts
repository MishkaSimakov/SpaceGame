import Spaceship from "./Spaceship";
import Module, {isModule, ModuleTypes} from "./modules/Module";
import {Event} from "./events/Event";
import {Options} from "./PlainToClass";

export type PlayerId = number;

export default class Player {
    id: PlayerId;
    name: string;

    spaceship: Spaceship;
    hand: (Module | Event)[] = [];

    energy: number = 0;
    skipNextTurn: boolean;

    online: boolean;

    usedRepairOrAttackModuleSecondTimeOnThisTurn: boolean = false;

    lose: boolean = false;

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
