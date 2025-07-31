import {Module, ModuleType} from "./Module";

export default class RepairModule extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Ремонтный модуль';
        this.type = ModuleType.RepairModule;
        this.sprite = 'repair-module';

        this.health = 3;
        this.totalHealth = 3;

        this.energyCost = 2;
    }
}