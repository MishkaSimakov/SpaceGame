import ModuleCard, {ModuleType} from "./ModuleCard";

export default class RepairModule extends ModuleCard {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Ремонтный модуль',
            ModuleType.RepairModule,
            3,
            {left, top, right, bottom}
        );

        this.energyCost = 2;
    }
}