// да, я понимаю, что порешатель и solver имеют разное значение, это такая шутка

import Module, {ModuleType} from "./Module";

export default class SpaceSolver extends Module {
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