import Module, {ModuleType} from "./Module";

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
        const indexToRomanian: string[] = ['I', 'II', 'III', 'IV', 'V'];

        super(
            'Командный модуль ' + indexToRomanian[index - 1],
            ModuleType.MainModule,
            13,
            connectors
        );

        this.mainModuleType = type;
        this.energyIncrease = 1;
        this.capacity = 5;
    }
}

export {MainModule, MainModuleType};