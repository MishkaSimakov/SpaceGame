import {Group} from "../engine/Group";
import {ShapeConfig} from "../engine/Shape";
import {GetSet} from "../engine/types";
import {Factory} from "../engine/Factory";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";

export interface ButtonConfig extends ShapeConfig {
    text?: string;
    disabled?: boolean;

    fill?: string;
    hoverFill?: string;
    activeFill?: string;
}

export class Button extends Group<ButtonConfig> {
    _background: Rectangle;
    _text: Text;

    _state: 'DEFAULT' | 'HOVER' | 'ACTIVE' = 'DEFAULT';

    constructor(config?: ButtonConfig) {
        super(config);

        let width = this.width(),
            height = this.height(),
            text = this.text();

        this._background = new Rectangle({
            width: width,
            height: height,
            fill: this.fill()
        });

        this._text = new Text({
            x: width / 2,
            y: height / 2,
            text: text,
            originY: 0.5,
            originX: 0.5,
            fill: "white",
            fontFamily: "Exo2Bold",
        });

        this.add(this._background, this._text);

        if (this.isPointerInside()) {
            this._state = 'HOVER';

            this._updateFill();
        }

        this.on('pointerenter', () => {
            if (this._state !== 'ACTIVE') {
                this._state = 'HOVER';

                this._updateFill();
            }
        });

        this.on('pointerout', () => {
            this._state = 'DEFAULT';

            this._updateFill();
        });

        this.on('pointerdown', () => {
            this._state = 'ACTIVE';

            this._updateFill();
        });

        this.on('pointerup', () => {
            this._state = 'HOVER';

            this._updateFill();
        })
    }

    isPointerInside(): boolean {
        const pos = this.getRelativePointerPosition();

        return !!this.getClientRect()?.contains(pos);
    }

    _updateFill() {
        if (this._state === 'DEFAULT') {
            this._background.fill(this.fill());
        } else if (this._state === 'HOVER') {
            this._background.fill(this.hoverFill());
        } else if (this._state === 'ACTIVE') {
            this._background.fill(this.activeFill());
        }
    }

    fill: GetSet<string, this>;
    hoverFill: GetSet<string, this>;
    activeFill: GetSet<string, this>;

    text: GetSet<string, this>;
    disabled: GetSet<boolean, this>;
}

Factory.addGetterSetter(Button, 'fill', '');
Factory.addGetterSetter(Button, 'hoverFill', '');
Factory.addGetterSetter(Button, 'activeFill', '');

Factory.addGetterSetter(Button, 'text', '');
Factory.addGetterSetter(Button, 'disabled', false);
