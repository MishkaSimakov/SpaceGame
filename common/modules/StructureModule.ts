import Module, {ModuleType} from "./Module";

export default class StructureModule extends Module {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(
            'Структурный модуль',
            ModuleType.StructureModule,
            5,
            {left, top, right, bottom}
        );
    }
}