import ModuleCard, {ModuleType} from "./ModuleCard";

export default class SmallBattery extends ModuleCard {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Малый аккумулятор',
            ModuleType.SmallBattery,
            3,
            {left, top, right, bottom}
        );

        this.capacity = 5;
    }
}