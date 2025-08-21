import ModuleCard, {ModuleType} from "./ModuleCard";

export default class QuantumDestabilizer extends ModuleCard {
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