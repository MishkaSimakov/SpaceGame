import ModuleCard, {ModuleType} from "./ModuleCard";

export default class NuclearReactor extends ModuleCard {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Атомный реактор',
            ModuleType.NuclearReactor,
            3,
            {left, top, right, bottom}
        );

        this.energyIncrease = 2;
    }
}