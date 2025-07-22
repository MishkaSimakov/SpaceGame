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

    constructor(index: number, type: MainModuleType, connectors: {
        top: number,
        right: number,
        bottom: number,
        left: number
    }) {
        super(connectors);

        this.mainModuleType = type;

        let indexToRomanian: string[] = ['I', 'II', 'III', 'IV', 'V'];

        this.name = 'Командный модуль ' + indexToRomanian[index - 1];
        this.sprite = 'main-module';
        this.type = ModuleTypes.MainModule;
        this.isMain = true;

        this.energyIncrease = 1;
        this.capacity = 5;
        this.health = 13;
        this.totalHealth = 13;
    }
}

export {MainModule, MainModuleType};