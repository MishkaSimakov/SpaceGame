import Module, {ModuleType} from "./Module";

export default class SmallQuantumProtector extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Малый квантовый протектор',
            ModuleType.SmallQuantumProtector,
            3,
            {left, top, right, bottom}
        );

        this.energyCost = 2;
    }
}