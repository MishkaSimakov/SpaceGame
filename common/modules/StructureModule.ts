import ModuleCard, {ModuleType} from "./ModuleCard";

export default class StructureModule extends ModuleCard {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Структурный модуль',
            ModuleType.StructureModule,
            5,
            {left, top, right, bottom}
        );
    }
}