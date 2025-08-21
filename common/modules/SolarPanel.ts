import ModuleCard, {ModuleType} from "./ModuleCard";

export default class SolarPanel extends ModuleCard {
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