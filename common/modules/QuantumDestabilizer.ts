import {Module, ModuleType} from "./Module";

export default class QuantumDestabilizer extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Квантовый дестабилизатор';
        this.type = ModuleType.QuantumDestabilizer;
        this.sprite = 'quantum-destabilizer';

        this.strength = 5;
        this.health = 3;
        this.totalHealth = 3;

        this.energyCost = 5;
    }
}