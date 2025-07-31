import {Module, ModuleType} from "./Module";

export default class AttackModule extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Абордажный модуль';
        this.type = ModuleType.AttackModule;
        this.sprite = 'attack-module';

        this.health = 3;
        this.totalHealth = 3;

        this.energyCost = 5;
    }
}