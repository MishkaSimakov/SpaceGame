import {Group} from "../engine/Group";
import {ShapeConfig} from "../engine/Shape";
import {GetSet} from "../engine/types";
import {Factory} from "../engine/Factory";
import Module, {isModule} from "../../../../common/modules/Module";
import {isEvent, Event} from "../../../../common/events/Event";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import Color from "../Color";

export interface CardConfig extends ShapeConfig {
    size: number;
    card: (Module | Event);
}

export class Card extends Group<CardConfig> {
    _background: Rectangle;
    _title: Text;
    _values: Text;
    _connectors: Rectangle[] = [];

    constructor(config: CardConfig) {
        super(config);

        let size = this.size(),
            card = this.card(),
            scale = this.size() / 256,
            title = isModule(card)
                ? card.toString().replace(' ', '\n')
                : card.toString(),
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

        this._background = new Rectangle({
            width: size,
            height: size,
            fill: color.toString()
        });

        this._title = new Text({
            x: size / 2,
            y: size / 2,
            fontFamily: "Exo2Bold",
            fontSize: 25 * scale,
            fill: "white",
            originX: 0.5,
            originY: 0.5,
            align: 'center',
            text: title
        });

        this.add(this._background, this._title);

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
                text: module.getCharacteristicsString()
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

            this.add(this._values, ...this._connectors);
        }
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

    size: GetSet<number, this>;
    card: GetSet<Module | Event, this>;
}

Factory.addGetterSetter(Card, 'size', 100);
Factory.addGetterSetter(Card, 'card');
