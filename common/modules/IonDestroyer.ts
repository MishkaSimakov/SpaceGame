import Module, {ModuleType} from "./Module";

export default class IonDestroyer extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Ионный разрушитель',
            ModuleType.IonDestroyer,
            3,
            {left, top, right, bottom}
        );

        this.strength = 3;
        this.energyCost = 2;
    }
}