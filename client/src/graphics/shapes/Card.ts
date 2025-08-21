import {isEvent, EventCard} from "@common/events/EventCard";
import ModuleCard, {isMainModule, isModule} from "@common/modules/ModuleCard";

import {Group} from "../engine/Group";
import {ShapeConfig} from "../engine/Shape";
import {GetSet} from "../engine/types";
import {Factory} from "../engine/Factory";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import Color from "../Color";


export type ModuleStates = 'DEFAULT' | 'ENABLED' | 'DISABLED' | 'PROTECTED' | 'SELECTED';

export interface CardConfig extends ShapeConfig {
    size: number;
    card: (ModuleCard | EventCard);
    stroke?: string;
    strokeWidth?: number;
    state?: ModuleStates,
    connectorsState?: Record<string, "connected" | "disconnected">

    disabledColor?: string
}

/**
 * Returns a color hex between '#5A7F52' (healthy) and '#711618' (critical)
 * based on the module's current health and total health.
 */
function getModuleColor(health: number, maxHealth: number): Color {
    // Clamp health ratio between 0 and 1
    const ratio = Math.max(0, Math.min(health / maxHealth, 1));

    // Parse hex colors to RGB
    const start = Color.fromRGBA(0x5A, 0x7F, 0x52); // Healthy green
    const end = Color.fromRGBA(0x71, 0x16, 0x18); // Critical red

    return Color.interpolate(start, end, 1 - ratio);
}

export class Card extends Group<CardConfig> {
    _rotationGroup: Group;
    _background: Rectangle;
    _strokeRect: Rectangle;
    _title: Text;
    _values: Text;
    _connectors: Rectangle[] = [];
    _hitRect: Rectangle;

    constructor(config: CardConfig) {
        super(config);

        const size = this.size(),
            card = this.card(),
            scale = this.size() / 256,
            title = isModule(card)
                ? card.name.replaceAll(' ', '\n')
                : card.description,
            baseConnectorWidth = 100,
            baseConnectorHeight = 20;

        let blueColor = Color.fromHex('#4343F4').toString();
        let redColor = Color.fromHex('#EA4035').toString();

        let color: Color;

        if (isModule(card)) {
            color = getModuleColor(card.health, card.totalHealth);
            // if (isMainModule(card)) {
            //     color = Color.fromHex('#155745');
            // } else {
            //     color = Color.fromHex('#95AFBA');
            // }

        } else {
            color = Color.fromHex('#f8b195');
        }

        this._rotationGroup = new Group({
            width: size,
            height: size
        });

        const offset = 10 * scale;
        this._background = new Rectangle({
            width: size - offset * 2,
            height: size - offset * 2,
            x: offset,
            y: offset,
            fill: color.toString(),
            cornerRadius: 5
        });

        this._strokeRect = new Rectangle({
            width: size,
            height: size,
            x: 0,
            y: 0,
            fill: Color.transparent().toString(),
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
            let module = card as ModuleCard;

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
                    y: -1,
                    originX: 0.5,
                    width: baseConnectorWidth * scale,
                    height: baseConnectorHeight * scale + 1,
                    fill: module.connectors.top === 1 ? blueColor : redColor,
                    cornerRadius: [0, 0, 10 * scale, 10 * scale]
                }));
            }

            if (module.connectors.left) {
                this._connectors.push(new Rectangle({
                    x: -1,
                    y: size / 2,
                    originY: 0.5,
                    width: baseConnectorHeight * scale + 1,
                    height: baseConnectorWidth * scale,
                    fill: module.connectors.left === 1 ? blueColor : redColor,
                    cornerRadius: [0, 10 * scale, 10 * scale, 0]
                }));
            }

            if (module.connectors.bottom) {
                this._connectors.push(new Rectangle({
                    x: size / 2,
                    y: size + 1,
                    originY: 1,
                    originX: 0.5,
                    width: baseConnectorWidth * scale,
                    height: baseConnectorHeight * scale + 1,
                    fill: module.connectors.bottom === 1 ? blueColor : redColor,
                    cornerRadius: [10 * scale, 10 * scale, 0, 0]
                }));
            }

            if (module.connectors.right) {
                this._connectors.push(new Rectangle({
                    x: size + 1,
                    y: size / 2,
                    originX: 1,
                    originY: 0.5,
                    width: baseConnectorHeight * scale + 1,
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
            x: -1,
            y: -1,
            width: size + 2,
            height: size + 2,
            visible: false
        });

        this.add(this._strokeRect);
        this.add(this._hitRect);

        this.width(size);
        this.height(size);
    }

    drawHit() {
        if (!this.shouldDrawHit())
            return false;

        this._hitRect.drawHit();
    }

    rotateCard(rotation) {
        this._rotationGroup.rotation(rotation);
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

        const module = card as ModuleCard;

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
        this._strokeRect.stroke(color);

        return this;
    }

    getStroke(): string {
        return this._strokeRect.stroke();
    }

    setStrokeWidth(width: number): Card {
        this._strokeRect.strokeWidth(width);

        return this;
    }

    getStrokeWidth(): number {
        return this._strokeRect.strokeWidth();
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
    card: GetSet<ModuleCard | EventCard, this>;
    stroke: GetSet<string, this>;
    strokeWidth: GetSet<number, this>;
    state: GetSet<ModuleStates, this>;
    connectorsState: GetSet<Record<string, "connected" | "disconnected">, this>;

    disabledColor: GetSet<string, this>;
}

Factory.addGetterSetter(Card, 'size', 100);
Factory.addGetterSetter(Card, 'card');

Factory.addGetterSetter(Card, 'stroke');
Factory.addGetterSetter(Card, 'strokeWidth');

Factory.addGetterSetter(Card, 'state', 'DEFAULT');
Factory.addGetterSetter(Card, 'connectorsState');

Factory.addGetterSetter(Card, 'disabledColor', Color.fromHex('#000000', 0.5).toString());
