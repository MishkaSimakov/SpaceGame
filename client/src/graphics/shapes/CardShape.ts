import {Card} from "@common/Types";

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
    card: Card;
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

export class CardShape extends Group<CardConfig> {
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
            title = card.cardType === "module"
                ? card.module.name.replaceAll(' ', '\n')
                : card.event.description,
            baseConnectorWidth = 100,
            baseConnectorHeight = 20;

        let blueColor = Color.fromHex('#4343F4').toString();
        let redColor = Color.fromHex('#EA4035').toString();

        let color: Color;

        if (card.cardType === "module") {
            color = getModuleColor(card.module.health, card.module.totalHealth);
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
            text: title,
        });

        if (card.cardType === "module") {
            const titleWidth = this._title.getWidth();
            if (titleWidth > size - 20 * scale) {
                this._title.fontSize(titleFontSize * (size - 20 * scale) / titleWidth);
            }
        } else {
            this._title.maxWidth(size - 20 * scale).fontSize(15 * scale);
        }

        this.add(this._background, this._title);

        this.add(this._rotationGroup);

        if (card.cardType === "module") {
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

            if (card.module.connectors.top) {
                this._connectors.push(new Rectangle({
                    x: size / 2,
                    y: -1,
                    originX: 0.5,
                    width: baseConnectorWidth * scale,
                    height: baseConnectorHeight * scale + 1,
                    fill: card.module.connectors.top === 1 ? blueColor : redColor,
                    cornerRadius: [0, 0, 10 * scale, 10 * scale]
                }));
            }

            if (card.module.connectors.left) {
                this._connectors.push(new Rectangle({
                    x: -1,
                    y: size / 2,
                    originY: 0.5,
                    width: baseConnectorHeight * scale + 1,
                    height: baseConnectorWidth * scale,
                    fill: card.module.connectors.left === 1 ? blueColor : redColor,
                    cornerRadius: [0, 10 * scale, 10 * scale, 0]
                }));
            }

            if (card.module.connectors.bottom) {
                this._connectors.push(new Rectangle({
                    x: size / 2,
                    y: size + 1,
                    originY: 1,
                    originX: 0.5,
                    width: baseConnectorWidth * scale,
                    height: baseConnectorHeight * scale + 1,
                    fill: card.module.connectors.bottom === 1 ? blueColor : redColor,
                    cornerRadius: [10 * scale, 10 * scale, 0, 0]
                }));
            }

            if (card.module.connectors.right) {
                this._connectors.push(new Rectangle({
                    x: size + 1,
                    y: size / 2,
                    originX: 1,
                    originY: 0.5,
                    width: baseConnectorHeight * scale + 1,
                    height: baseConnectorWidth * scale,
                    fill: card.module.connectors.right === 1 ? blueColor : redColor,
                    cornerRadius: [10 * scale, 0, 0, 10 * scale]
                }));
            }

            this._rotationGroup.add(...this._connectors);

            this._rotationGroup.rotation(card.module.rotation * (Math.PI / 2));

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
        return this.card().cardType === "module";
    }

    get isEvent(): boolean {
        return this.card().cardType === "event";
    }

    private getCharacteristicsString(): string {
        const card = this.card();

        if (!card || card.cardType === "event")
            return "";

        let values = '';
        const module = card.module;

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

    setStroke(color: string): CardShape {
        this._strokeRect.stroke(color);

        return this;
    }

    getStroke(): string {
        return this._strokeRect.stroke();
    }

    setStrokeWidth(width: number): CardShape {
        this._strokeRect.strokeWidth(width);

        return this;
    }

    getStrokeWidth(): number {
        return this._strokeRect.strokeWidth();
    }

    setState(state: ModuleStates): CardShape {
        const currState = this.state();

        if (currState === 'ENABLED' && state === 'DISABLED')
            return this;

        this._hitRect.visible(state !== 'DEFAULT' && state !== 'ENABLED');

        this.setAttr('state', state);

        this.updateStateColor();

        return this;
    }

    setDisabledColor(color: string): CardShape {
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
    card: GetSet<Card, this>;
    stroke: GetSet<string, this>;
    strokeWidth: GetSet<number, this>;
    state: GetSet<ModuleStates, this>;
    connectorsState: GetSet<Record<string, "connected" | "disconnected">, this>;

    disabledColor: GetSet<string, this>;
}

Factory.addGetterSetter(CardShape, 'size', 100);
Factory.addGetterSetter(CardShape, 'card');

Factory.addGetterSetter(CardShape, 'stroke');
Factory.addGetterSetter(CardShape, 'strokeWidth');

Factory.addGetterSetter(CardShape, 'state', 'DEFAULT');
Factory.addGetterSetter(CardShape, 'connectorsState');

Factory.addGetterSetter(CardShape, 'disabledColor', Color.fromHex('#000000', 0.5).toString());
