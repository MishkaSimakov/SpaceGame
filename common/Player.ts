import Spaceship from "./Spaceship";
import Module, {isModule, ModuleTypes} from "./modules/Module";
import {Event} from "./events/Event";
import {Options} from "./PlainToClass";
import {OtherPlayer} from "./GameForPlayerDTO";

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
            if (deepEqual(arr1[idx_1], arr2[idx_2], ['x', 'y', 'rotation'])) {
                arr2.splice(idx_2, 1);
                break;
            }

    return !arr2.length;
}


export default class Player {
    link: number;
    socketId: string;

    spaceship: Spaceship;
    hand: (Module | Event)[] = [];

    energy: number = 0;
    skipNextTurn: boolean;

    online: boolean;

    usedRepairOrAttackModuleSecondTimeOnThisTurn: boolean = false;

    protected lose: boolean = false;

    constructor() {
        this.link = this.generateLink();
    }

    protected generateLink(): number {
        const linkSize = 6;

        return Math.floor(Math.pow(10, linkSize - 1) * (Math.random() * 9 + 1));
    }

    canBeTurnedInto(changedPlayer: Player): boolean {
        let currentCards = [...this.spaceship.modules, ...this.hand];
        let changedCards = [...changedPlayer.spaceship.modules, ...changedPlayer.hand];

        return arrayCompare(currentCards, changedCards) && this.energy === changedPlayer.energy;
    }

    collectEnergy() {
        this.energy = Math.min(this.energy + this.spaceship.getTotalEnergyIncrease(), this.spaceship.getTotalCapacity());
    }

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

    getOtherPlayer(): OtherPlayer {
        let otherPlayer = new OtherPlayer();

        otherPlayer.link = this.link;
        otherPlayer.energy = this.energy;
        otherPlayer.online = this.online;
        otherPlayer.spaceship = this.spaceship;
        otherPlayer.handSize = this.hand.length;

        return otherPlayer;
    }
}