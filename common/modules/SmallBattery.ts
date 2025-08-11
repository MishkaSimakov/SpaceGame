import Module, {ModuleType} from "./Module";

export default class SmallBattery extends Module {
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