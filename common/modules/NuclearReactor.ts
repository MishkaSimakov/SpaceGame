import {Module, ModuleType} from "./Module";

export default class NuclearReactor extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Атомный реактор';
        this.type = ModuleType.NuclearReactor;
        this.sprite = 'nuclear-reactor';

        this.energyIncrease = 2;
        this.health = 3;
        this.totalHealth = 3;
    }
}