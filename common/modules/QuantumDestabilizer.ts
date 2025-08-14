import Module, {ModuleType} from "./Module";

export default class QuantumDestabilizer extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Квантовый дестабилизатор',
            ModuleType.QuantumDestabilizer,
            3,
            {left, top, right, bottom}
        );

        this.strength = 5;
        this.energyCost = 5;
    }
}