import Module, {ModuleType} from "./Module";

export default class QuantumProtector extends Module {
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