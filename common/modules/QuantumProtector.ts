import ModuleCard, {ModuleType} from "./ModuleCard";

export default class QuantumProtector extends ModuleCard {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Квантовый протектор',
            ModuleType.QuantumProtector,
            5,
            {left, top, right, bottom}
        );

        this.energyCost = 5;
    }
}