import Module, {ModuleType} from "./Module";

export default class DarkMatterGenerator extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Генератор тёмной материи',
            ModuleType.DarkMatterGenerator,
            3,
            {left, top, right, bottom}
        );

        this.energyIncrease = 3;
    }
}