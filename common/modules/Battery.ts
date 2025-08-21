import ModuleCard, {ModuleType} from "./ModuleCard";

export default class Battery extends ModuleCard {
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