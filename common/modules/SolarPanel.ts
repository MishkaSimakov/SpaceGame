import {Module, ModuleTypes} from "./Module";

export default class SolarPanel extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Солнечная батарея';
        this.type = ModuleTypes.SolarPanel;
        this.sprite = 'solar-panel';

        this.energyIncrease = 1;
        this.health = 1;
        this.totalHealth = 1;
    }
}