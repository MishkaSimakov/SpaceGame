import {Module, ModuleTypes} from "./Module";

enum MainModuleType {
    DrawAnotherEventCard,
    DrawAdditionalModuleCard,
    MoveDamage,
    UseModuleSecondTime,
    AttackOrRunaway
}

class MainModule extends Module {
    mainModuleType: MainModuleType;

    constructor(type: MainModuleType) {
        super({
            'left': 1,
            'top': 1,
            'right': 1,
            'bottom': 1
        });

        this.mainModuleType = type;

        this.name = 'Главный модуль';
        this.type = ModuleTypes.MainModule;
        this.isMain = true;

        this.energyIncrease = 10;
        this.capacity = 50;
        this.health = 25;
        this.totalHealth = 25;
    }
}

export {MainModule, MainModuleType};