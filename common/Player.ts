import Spaceship from "./Spaceship";
import Module from "./modules/Module";
import {Event} from "./events/Event";

export type PlayerId = number;

export default class Player {
    id: PlayerId;
    name: string;
    spaceship: Spaceship;
    hand: (Module | Event)[] = [];
    energy: number = 0;
    skipNextTurn: boolean = false;
    usedModuleSecondTimeOnThisTurn: boolean = false;
    lose: boolean = false;
    time: number = 0;

    constructor(id: PlayerId, name: string, spaceship: Spaceship) {
        this.id = id;
        this.name = name;
        this.spaceship = spaceship;
    }
}
