import {Module, ModuleType} from "./Module";

export default class StructureModule extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Структурный модуль';
        this.type = ModuleType.StructureModule;
        this.sprite = 'structure-module';

        this.health = 5;
        this.totalHealth = 5;
    }
}