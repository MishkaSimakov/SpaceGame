import Module, {ModuleType} from "./Module";

export default class Battery extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Аккумулятор';
        this.type = ModuleType.Battery;

        this.health = 4;
        this.totalHealth = 4;
        this.capacity = 10;
    }
}