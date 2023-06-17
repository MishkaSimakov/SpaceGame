import {Group} from "../engine/Group";
import {ShapeConfig} from "../engine/Shape";
import {GetSet} from "../engine/types";
import {Factory} from "../engine/Factory";
import Module, {isModule} from "../../../../common/modules/Module";
import {isEvent, Event} from "../../../../common/events/Event";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import Color from "../Color";


export type ModuleStates = 'DEFAULT' | 'ENABLED' | 'DISABLED' | 'PROTECTED' | 'SELECTED';

export interface CardConfig extends ShapeConfig {
    size: number;
    card: (Module | Event);
    stroke?: string;
    strokeWidth?: number;
    state?: ModuleStates,

    disabledColor?: string
}

export class Card extends Group<CardConfig> {
    _rotationGroup: Group;
    _background: Rectangle;
    _title: Text;
    _values: Text;
    _connectors: Rectangle[] = [];
    _hitRect: Rectangle;

    constructor(config: CardConfig) {
        super(config);

        let size = this.size(),
            card = this.card(),
            scale = this.size() / 256,
            title = isModule(card)
                ? (card as Module).name.replaceAll(' ', '\n')
                : (card as Event).description,
            baseConnectorWidth = 150,
            baseConnectorHeight = 18;

        let blueColor = Color.fromHex('#4343FE').toString();
        let redColor = Color.fromHex('#FF2525').toString();

        let color: Color;

        if (isModule(card)) {
            if ((card as Module).isMain) {
                color = Color.fromHex('#155745');
            } else if ((card as Module).isActivated) {
                color = Color.fromHex('#30332E');
            } else {
                color = Color.fromHex('#95AFBA');
            }
        } else {
            color = Color.fromHex('#f8b195');
        }

        this._rotationGroup = new Group({
            width: size,
            height: size
        });

        this._background = new Rectangle({
            width: size,
            height: size,
            fill: color.toString(),
            x: 0,
            y: 0
        });

        const titleFontSize = 25 * scale;
        this._title = new Text({
            x: size / 2,
            y: size / 2,
            fontFamily: "Exo2Bold",
            fontSize: titleFontSize,
            fill: "white",
            originX: 0.5,
            originY: 0.5,
            align: 'center',
            text: title
        });

        const titleWidth = this._title.getWidth();
        if (titleWidth > size - 20 * scale) {
            this._title.fontSize(titleFontSize * (size - 20 * scale) / titleWidth);
        }

        this.add(this._background, this._title);

        this.add(this._rotationGroup);

        if (isModule(card)) {
            let module = card as Module;

            this._values = new Text({
                x: size / 2,
                y: size * 3 / 4,
                fontFamily: "Exo2Bold",
                fontSize: 15 * scale,
                fill: "white",
                originX: 0.5,
                originY: 0.5,
                text: this.getCharacteristicsString()
            });

            if (module.connectors.top) {
                this._connectors.push(new Rectangle({
                    x: size / 2,
                    y: 0,
                    originX: 0.5,
                    width: baseConnectorWidth * scale,
                    height: baseConnectorHeight * scale,
                    fill: module.connectors.top === 1 ? blueColor : redColor,
                    cornerRadius: [0, 0, 10 * scale, 10 * scale]
                }));
            }

            if (module.connectors.left) {
                this._connectors.push(new Rectangle({
                    x: 0,
                    y: size / 2,
                    originY: 0.5,
                    width: baseConnectorHeight * scale,
                    height: baseConnectorWidth * scale,
                    fill: module.connectors.left === 1 ? blueColor : redColor,
                    cornerRadius: [0, 10 * scale, 10 * scale, 0]
                }));
            }

            if (module.connectors.bottom) {
                this._connectors.push(new Rectangle({
                    x: size / 2,
                    y: size,
                    originY: 1,
                    originX: 0.5,
                    width: baseConnectorWidth * scale,
                    height: baseConnectorHeight * scale,
                    fill: module.connectors.bottom === 1 ? blueColor : redColor,
                    cornerRadius: [10 * scale, 10 * scale, 0, 0]
                }));
            }

            if (module.connectors.right) {
                this._connectors.push(new Rectangle({
                    x: size,
                    y: size / 2,
                    originX: 1,
                    originY: 0.5,
                    width: baseConnectorHeight * scale,
                    height: baseConnectorWidth * scale,
                    fill: module.connectors.right === 1 ? blueColor : redColor,
                    cornerRadius: [10 * scale, 0, 0, 10 * scale]
                }));
            }

            this._rotationGroup.add(...this._connectors);

            this._rotationGroup.rotation(module.rotation * (Math.PI / 2));

            this.add(this._values);
        }

        this._hitRect = new Rectangle({
            x: 0,
            y: 0,
            width: size,
            height: size,
            visible: false
        });

        this.add(this._hitRect);
    }

    drawHit() {
        if (!this.shouldDrawHit())
            return false;

        this._hitRect.drawHit();
    }

    rotateCard(rotation) {
        this._rotationGroup.rotation(rotation);
    }

    setWidth() {
        console.warn('Nope! Use setSize instead');
    }

    setHeight() {
        console.warn('Nope! Use setSize instead');
    }

    get isModule(): boolean {
        return isModule(this.card());
    }

    get isEvent(): boolean {
        return isEvent(this.card());
    }

    private getCharacteristicsString(): string {
        const card = this.card();

        if (!card || !isModule(card))
            return "";

        const module = card as Module;

        let values = '';

        values += module.health + '/' + module.totalHealth + '❤️';

        if (module.strength)
            values += ' ' + module.strength + '🎯';

        if (module.capacity)
            values += ' ' + module.capacity + '🔋';

        if (module.energyIncrease)
            values += ' +' + module.energyIncrease + '⚡️';

        if (module.energyCost)
            values += ' -' + module.energyCost + '⚡️'

        return values;
    }

    setStroke(color: string): Card {
        this._background.stroke(color);

        return this;
    }

    getStroke(): string {
        return this._background.stroke();
    }

    setStrokeWidth(width: number): Card {
        this._background.strokeWidth(width);

        return this;
    }

    getStrokeWidth(): number {
        return this._background.strokeWidth();
    }

    setState(state: ModuleStates): Card {
        const currState = this.state();

        if (currState === 'ENABLED' && state === 'DISABLED')
            return this;

        this._hitRect.visible(state !== 'DEFAULT' && state !== 'ENABLED');

        this.setAttr('state', state);

        this.updateStateColor();

        return this;
    }

    setDisabledColor(color: string): Card {
        this.setAttr('disabledColor', color);

        this.updateStateColor();

        return this;
    }

    private updateStateColor() {
        const state = this.state();

        if (state === 'DISABLED') {
            this._hitRect.fill(this.disabledColor());
        }
    }

    size: GetSet<number, this>;
    card: GetSet<Module | Event, this>;
    stroke: GetSet<string, this>;
    strokeWidth: GetSet<number, this>;
    state: GetSet<ModuleStates, this>;

    disabledColor: GetSet<string, this>;
}

Factory.addGetterSetter(Card, 'size', 100);
Factory.addGetterSetter(Card, 'card');

Factory.addGetterSetter(Card, 'stroke');
Factory.addGetterSetter(Card, 'strokeWidth');

Factory.addGetterSetter(Card, 'state', 'DEFAULT');

Factory.addGetterSetter(Card, 'disabledColor', Color.fromHex('#000000', 0.5).toString());
