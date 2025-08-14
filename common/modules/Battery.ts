import Module, {ModuleType} from "./Module";

export default class Battery extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Аккумулятор',
            ModuleType.Battery,
            4,
            {left, top, right, bottom}
        );

        this.capacity = 10;
    }
}