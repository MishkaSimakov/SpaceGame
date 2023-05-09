// да, я понимаю, что порешатель и solver имеют разное значение, это такая шутка

import {Module, ModuleTypes} from "./Module";

export default class SpaceSolver extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Космический порешатель';
        this.type = ModuleTypes.SpaceSolver;
        this.sprite = 'space-solver';

        this.strength = 10;
        this.health = 10;
        this.totalHealth = 10;

        this.energyCost = 5;
    }
}