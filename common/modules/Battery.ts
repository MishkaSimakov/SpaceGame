// да, я понимаю, что порешатель и solver имеют разное значение, это такая шутка

import {Module, ModuleType} from "./Module";

export default class Battery extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Аккумулятор';
        this.type = ModuleType.Battery;
        this.sprite = 'battery';

        this.health = 4;
        this.totalHealth = 4;
        this.capacity = 10;
    }
}