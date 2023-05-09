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

        this.health = 10;
        this.totalHealth = 10;

        this.energyCost = 10;
    }
}