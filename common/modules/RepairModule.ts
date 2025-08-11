import Module, {ModuleType} from "./Module";

export default class RepairModule extends Module {
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