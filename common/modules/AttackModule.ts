import ModuleCard, {ModuleType} from "./ModuleCard";

export default class AttackModule extends ModuleCard {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Абордажный модуль',
            ModuleType.AttackModule,
            3,
            {left, top, right, bottom}
        );

        this.energyCost = 5;
    }
}