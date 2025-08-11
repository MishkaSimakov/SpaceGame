import Module, {ModuleType} from "./Module";

export default class NuclearReactor extends Module {
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