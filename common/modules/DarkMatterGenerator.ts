import ModuleCard, {ModuleType} from "./ModuleCard";

export default class DarkMatterGenerator extends ModuleCard {
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