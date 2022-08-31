import {Module, ModuleTypes} from "./Module";

export default class AttackModule extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Абордажный модуль';
        this.type = ModuleTypes.AttackModule;

        this.health = 10;
        this.totalHealth = 10;
    }
}