import {Module, ModuleTypes} from "./Module";

export default class QuantumProtector extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Квантовый протектор';
        this.type = ModuleTypes.QuantumProtector;
        this.sprite = 'quantum-protector';

        this.health = 5;
        this.totalHealth = 5;

        this.energyCost = 5;
    }
}