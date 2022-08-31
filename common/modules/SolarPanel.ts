import {Module, ModuleTypes} from "./Module";

export default class SolarPanel extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Солнечная панель';
        this.type = ModuleTypes.SolarPanel;

        this.energyIncrease = 10;
        this.health = 10;
        this.totalHealth = 10;
    }
}