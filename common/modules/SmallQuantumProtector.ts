import {Module, ModuleTypes} from "./Module";

export default class SmallQuantumProtector extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Малый квантовый протектор';
        this.type = ModuleTypes.SmallQuantumProtector;
        this.sprite = 'small-quantum-protector';

        this.health = 3;
        this.totalHealth = 3;

        this.energyCost = 2;
    }
}