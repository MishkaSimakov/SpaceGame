import {Group} from "../engine/Group";
import {ShapeConfig} from "../engine/Shape";
import {GetSet} from "../engine/types";
import {Factory} from "../engine/Factory";

export interface ButtonConfig extends ShapeConfig {
    text?: string;
    disabled?: boolean
}

export class Button extends Group {
    constructor(config?: ButtonConfig) {
        super(config);
    }

    text: GetSet<string, this>;
    disabled: GetSet<boolean, this>;
}

Factory.addGetterSetter(Button, 'text', '');
Factory.addGetterSetter(Button, 'disabled', false);
