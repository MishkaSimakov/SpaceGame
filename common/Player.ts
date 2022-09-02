import Spaceship from "./Spaceship";
import Module from "./modules/Module";
import {Event} from "./events/Event";
import {Options} from "./PlainToClass";

function isObject(object) {
    return object != null && typeof object === 'object';
}

function deepEqual(object1: Object, object2: Object, exclude: string[] = []): boolean {
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);

    if (keys1.length !== keys2.length)
        return false;

    for (const key of keys1) {
        if (exclude.indexOf(key) !== -1)
            continue;

        const val1 = object1[key];
        const val2 = object2[key];
        const areObjects = isObject(val1) && isObject(val2);
        if (
            areObjects && !deepEqual(val1, val2, exclude) ||
            !areObjects && val1 !== val2
        )
            return false;
    }

    return true;
}

function arrayCompare<T>(arr1: Array<T>, arr2: Array<T>) {
    if (arr1.length !== arr2.length)
        return false;

    for (const idx_1 of arr1.keys())
        for (const idx_2 of arr2.keys())
            if (deepEqual(arr1[idx_1], arr2[idx_2], ['x', 'y'])) {
                arr2.splice(idx_2, 1);
                break;
            }

    return !arr2.length;
}


export default class Player {
    id: string;
    spaceship: Spaceship;

    hand: (Module|Event)[] = [];
    energy: number = 0;

    protected lose: boolean = false;

    constructor(id: string, spaceship: Spaceship) {
        this.id = id;
        this.spaceship = spaceship;
    }

    canBeTurnedInto(changedPlayer: Player): boolean {
        let currentCards = [...this.spaceship.modules, ...this.hand];
        let changedCards = [...changedPlayer.spaceship.modules, ...changedPlayer.hand];

        return arrayCompare(currentCards, changedCards) && this.energy === changedPlayer.energy;
    }

    collectEnergy() {
        this.energy = Math.min(this.energy + this.spaceship.getTotalEnergyIncrease(), this.spaceship.getTotalCapacity());
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
                class: Module
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