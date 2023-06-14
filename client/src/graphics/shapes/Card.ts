import {Group} from "../engine/Group";
import {ShapeConfig} from "../engine/Shape";
import {GetSet} from "../engine/types";
import {Factory} from "../engine/Factory";
import Module, {isModule} from "../../../../common/modules/Module";
import {Event} from "../../../../common/events/Event";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";

export interface CardConfig extends ShapeConfig {
    size: number;
    card: (Module | Event);
}

export class Card extends Group {
    _background: Rectangle;
    _title: Text;
    _values: Text;
    _connectors: Rectangle[];

    constructor(config: CardConfig) {
        super(config);

        let size = this.size(),
            card = this.card();

        this._background = new Rectangle({
            width: size,
            height: size,
            fill: 'cyan'
        });

        this._title = new Text({
            x: size / 2,
            y: size / 2,
            fontFamily: "Exo2Bold",
            fontSize: 10,
            fill: "white",
            originX: 0.5,
            originY: 0.5,
            text: card.toString()
        });

        this.add(this._background, this._title);

        if (isModule(card)) {
            let module = card as Module;

            this._values = new Text({
                x: size / 2,
                y: size * 3 / 4,
                fontFamily: "Exo2Bold",
                fontSize: 10,
                fill: "white",
                originX: 0.5,
                originY: 0.5,
                text: module.getCharacteristicsString()
            });

            this.add(this._values);
        }
    }

    setSize(size: number): Card {
        this.setAttr('width', size);
        this.setAttr('height', size);

        return this;
    }

    setWidth() {
        console.warn('Nope! Use setSize instead');
    }

    setHeight() {
        console.warn('Nope! Use setSize instead');
    }

    size: GetSet<number, this>;
    card: GetSet<Module | Event, this>;
}

Factory.addGetterSetter(Card, 'size', 100);
Factory.addGetterSetter(Card, 'card');
