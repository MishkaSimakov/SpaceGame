import {Group} from "../engine/Group";
import {ShapeConfig} from "../engine/Shape";
import {GetSet} from "../engine/types";
import {Factory} from "../engine/Factory";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";

export interface ButtonConfig extends ShapeConfig {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    disabled?: boolean;

    fill?: string;
    hoverFill?: string;
    activeFill?: string;
}

export class Button extends Group<ButtonConfig> {
    _background: Rectangle;
    _text: Text;
    _hitRect: Rectangle;

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
            if (this._state !== 'ACTIVE') {
                this._state = 'HOVER';

                this._updateFill();
            }
        });

        this._hitRect.on('pointerout', () => {
            this._state = 'DEFAULT';

            this._updateFill();
        });

        this._hitRect.on('pointerdown', () => {
            this._state = 'ACTIVE';

            this._updateFill();
        });

        this._hitRect.on('pointerup', () => {
            this._state = 'HOVER';

            this._updateFill();
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

        // TODO: decide whether make or not cursor pointer
        // document.body.style.cursor = stateDesign[this._state][0];
        this._background.fill(stateDesign[this._state][1]);
    }

    fill: GetSet<string, this>;
    hoverFill: GetSet<string, this>;
    activeFill: GetSet<string, this>;

    text: GetSet<string, this>;
    fontSize: GetSet<number, this>;
    fontFamily: GetSet<string, this>;
    disabled: GetSet<boolean, this>;
}

Factory.addGetterSetter(Button, 'fill', '');
Factory.addGetterSetter(Button, 'hoverFill', '');
Factory.addGetterSetter(Button, 'activeFill', '');

Factory.addGetterSetter(Button, 'text', '');
Factory.addGetterSetter(Button, 'fontSize', 12);
Factory.addGetterSetter(Button, 'fontFamily', 'Exo2Bold');
Factory.addGetterSetter(Button, 'disabled', false);
