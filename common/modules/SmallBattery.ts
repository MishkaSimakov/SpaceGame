import Module, {ModuleType} from "./Module";

export default class SmallBattery extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Малый аккумулятор';
        this.type = ModuleType.SmallBattery;

        this.health = 3;
        this.totalHealth = 3;
        this.capacity = 5;
    }
}