import {Module, ModuleTypes} from "./Module";

export default class RepairModule extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Ремонтный модуль';
        this.type = ModuleTypes.RepairModule;

        this.health = 10;
        this.totalHealth = 10;

        this.energyCost = 25;
    }
}