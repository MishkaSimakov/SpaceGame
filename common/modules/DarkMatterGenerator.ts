import Module, {ModuleType} from "./Module";

export default class DarkMatterGenerator extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Генератор тёмной материи';
        this.type = ModuleType.DarkMatterGenerator;

        this.energyIncrease = 3;
        this.health = 3;
        this.totalHealth = 3;
    }
}