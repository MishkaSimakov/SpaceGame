

import ModuleCard, {ModuleType} from "./ModuleCard";

export default class SpaceSolver extends ModuleCard {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Космический порешатель',
            ModuleType.SpaceSolver,
            1,
            {left, top, right, bottom}
        );

        this.strength = 1;
        this.energyCost = 1;
    }
}