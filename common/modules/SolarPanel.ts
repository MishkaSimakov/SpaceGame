import Module, {ModuleType} from "./Module";

export default class SolarPanel extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Солнечная батарея',
            ModuleType.SolarPanel,
            1,
            {left, top, right, bottom}
        );

        this.energyIncrease = 1;
    }
}