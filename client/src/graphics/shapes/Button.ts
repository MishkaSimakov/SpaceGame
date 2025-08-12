import {Group} from "../engine/Group";
import {ShapeConfig} from "../engine/Shape";
import {GetSet} from "../engine/types";
import {Factory} from "../engine/Factory";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import Color from "../Color";
import {COLORS} from "../constants";

export interface ButtonConfig extends ShapeConfig {
    text?: string;
    fontSize?: number;
    fontFamily?: string;

    fill?: string;
    hoverFill?: string;
    activeFill?: string;
    disabledFill?: string;
}

export class Button extends Group<ButtonConfig> {
    _background: Rectangle;
    _text: Text;
    _disabledRect?: Rectangle = undefined;
    _hitRect: Rectangle;

    _state: 'DEFAULT' | 'HOVER' | 'ACTIVE' | 'DISABLED' = 'DEFAULT';

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
            fontFamily: this.fontFamily(),
            fontSize: this.fontSize()
        });

        this._hitRect = new Rectangle({
            x: 0,
            y: 0,
            width: width,
            height: height,
            visible: false,
        })

        this.add(this._background, this._text, this._hitRect);

        if (this.isPointerInside()) {
            this._state = 'HOVER';

            this._updateFill();
        }

        this._hitRect.on('pointerenter', () => {
            if (this._state !== 'ACTIVE' && this._state !== 'DISABLED') {
                this._state = 'HOVER';

                this._updateFill();
            }
        });

        this._hitRect.on('pointerout', () => {
            if (this._state !== 'DISABLED') {
                this._state = 'DEFAULT';

                this._updateFill();
            }
        });

        this._hitRect.on('pointerdown', () => {
            if (this._state !== 'DISABLED') {
                this._state = 'ACTIVE';

                this._updateFill();
            }
        });

        this._hitRect.on('pointerup', () => {
            if (this._state !== 'DISABLED') {
                this._state = 'HOVER';

                this._updateFill();
            }
        });
    }

    drawHit() {
        if (!this.shouldDrawHit())
            return;

        this._hitRect.drawHit();
    }

    isPointerInside(): boolean {
        const pos = this.getRelativePointerPosition();

        return !!this.getClientRect()?.contains(pos);
    }

    _updateFill() {
        const stateDesign = {
            'DEFAULT': ['default', this.fill()],
            'HOVER': ['pointer', this.hoverFill()],
            'ACTIVE': ['pointer', this.activeFill()],
        }

        if (this._state !== "DISABLED") {
            document.body.style.cursor = stateDesign[this._state][0];
            this._background.fill(stateDesign[this._state][1]);
        }
    }

    disabled(value: boolean) {
        if (value) {
            this._state = 'DISABLED';

            this._disabledRect = new Rectangle({
                x: 0,
                y: 0,
                fill: Color.fromRGBA(0, 0, 0, 0.5).toString(),
                width: this.width(),
                height: this.height(),
                visible: true,
                interactive: true
            });

            this.add(this._disabledRect);
        } else {
            this._state = this.isPointerInside() ? 'HOVER' : 'DEFAULT';

            this._disabledRect.destroy();
            this._disabledRect = undefined;
        }

        this._updateFill();
    }

    fill: GetSet<string, this>;
    hoverFill: GetSet<string, this>;
    activeFill: GetSet<string, this>;
    disabledFill: GetSet<string, this>;

    text: GetSet<string, this>;
    fontSize: GetSet<number, this>;
    fontFamily: GetSet<string, this>;
}

Factory.addGetterSetter(Button, 'fill', '');
Factory.addGetterSetter(Button, 'hoverFill', '');
Factory.addGetterSetter(Button, 'activeFill', '');
Factory.addGetterSetter(Button, 'disabledFill', '');

Factory.addGetterSetter(Button, 'text', '');
Factory.addGetterSetter(Button, 'fontSize', 12);
Factory.addGetterSetter(Button, 'fontFamily', 'Exo2Bold');
