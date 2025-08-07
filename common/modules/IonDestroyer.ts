import Module, {ModuleType} from "./Module";

export default class IonDestroyer extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super({
            'left': left,
            'top': top,
            'right': right,
            'bottom': bottom
        });

        this.name = 'Ионный разрушитель';
        this.type = ModuleType.IonDestroyer;

        this.strength = 3;
        this.health = 3;
        this.totalHealth = 3;

        this.energyCost = 2;
    }
}