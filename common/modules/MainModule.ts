import {Module, ModuleTypes} from "./Module";

export default class MainModule extends Module {
    constructor() {
        super({
            'left': 1,
            'top': 1,
            'right': 1,
            'bottom': 1
        });

        this.name = 'Главный модуль';
        this.type = ModuleTypes.MainModule;
        this.isMain = true;

        this.energyIncrease = 10;
        this.capacity = 50;
        this.health = 25;
        this.totalHealth = 25;
    }
}