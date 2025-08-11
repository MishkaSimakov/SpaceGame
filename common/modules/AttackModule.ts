import Module, {ModuleType} from "./Module";

export default class AttackModule extends Module {
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