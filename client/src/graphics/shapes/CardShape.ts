import {Card, EventCard, ModuleCard} from "@common/Types";

import {Group} from "../engine/Group";
import {ShapeConfig} from "../engine/Shape";
import {BoundingRect, GetSet, merge} from "../engine/types";
import {Factory} from "../engine/Factory";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import Color from "@common/helpers/Color";
import {Container} from "../engine/Container";
import {Node} from "../engine/Node";
import {getUserSettings} from "../../UserSettingsStore";


export type ModuleStates = 'DEFAULT' | 'ENABLED' | 'DISABLED' | 'PROTECTED' | 'SELECTED';

export interface CardConfig extends ShapeConfig {
    size: number;
    card: Card;
    stroke?: string;
    strokeWidth?: number;
    state?: ModuleStates,
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

        const card = config.card;
        const size = this.getSize();
        const scale = this.getSize() / 256;
        const title = card.cardType === "module"
            ? card.module.name.replaceAll(' ', '\n')
            : card.event.description;
        const baseConnectorWidth = 100;
        const baseConnectorHeight = 20;

        const connectorColor = {
            1: Color.fromHex(getUserSettings().blueConnectorColor).toString(),
            2: Color.fromHex(getUserSettings().redConnectorColor).toString()
        };

        const cardColor = card.cardType === "module"
            ? getModuleColor(card.module.health, card.module.totalHealth)
            : Color.fromHex('#f8b195');

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
            fill: cardColor.toString(),
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
            fill: Color.WHITE.toString(),
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
                fill: Color.WHITE.toString(),
                originX: 0.5,
                originY: 0.5,
                text: this.getCharacteristicsString(card)
            });

            const connectors = card.module.connectors;
            if (connectors.top !== 0) {
                this._connectors.push(new Rectangle({
                    x: size / 2,
                    y: -1,
                    originX: 0.5,
                    width: baseConnectorWidth * scale,
                    height: baseConnectorHeight * scale + 1,
                    fill: connectorColor[connectors.top],
                    cornerRadius: [0, 0, 10 * scale, 10 * scale]
                }));
            }

            if (connectors.left !== 0) {
                this._connectors.push(new Rectangle({
                    x: -1,
                    y: size / 2,
                    originY: 0.5,
                    width: baseConnectorHeight * scale + 1,
                    height: baseConnectorWidth * scale,
                    fill: connectorColor[connectors.left],
                    cornerRadius: [0, 10 * scale, 10 * scale, 0]
                }));
            }

            if (connectors.bottom !== 0) {
                this._connectors.push(new Rectangle({
                    x: size / 2,
                    y: size + 1,
                    originY: 1,
                    originX: 0.5,
                    width: baseConnectorWidth * scale,
                    height: baseConnectorHeight * scale + 1,
                    fill: connectorColor[connectors.bottom],
                    cornerRadius: [10 * scale, 10 * scale, 0, 0]
                }));
            }

            if (connectors.right !== 0) {
                this._connectors.push(new Rectangle({
                    x: size + 1,
                    y: size / 2,
                    originX: 1,
                    originY: 0.5,
                    width: baseConnectorHeight * scale + 1,
                    height: baseConnectorWidth * scale,
                    fill: connectorColor[connectors.right],
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
    }

    drawHit() {
        if (this.shouldDrawHit()) {
            this._hitRect.drawHit();
        }
    }

    rotateCard(rotation: number, duration: number) {
        if (duration > 0) {
            this._rotationGroup.animate({
                rotation
            }, duration);
        } else {
            this._rotationGroup.abortAnimation();
            this._rotationGroup.rotation(rotation);
        }
    }

    getWidth(): number {
        return this.getSize();
    }

    getHeight(): number {
        return this.getSize();
    }

    getClientRect(relativeTo?: Container<Node>, ignoreStroke?: boolean): BoundingRect | undefined {
        if (!this.isVisible()) {
            return;
        }

        return this.transformedRect(
            new BoundingRect(0, 0, this.getSize(), this.getSize()),
            relativeTo ?? this.getScene()
        );
    }

    private getCharacteristicsString(card: Card): string {
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
        this.setAttr('state', state);

        this.updateStateColor();

        return this;
    }

    private updateStateColor() {
        const state = this.state();

        if (state === 'DISABLED') {
            this.brightness(0.5);
        } else {
            this.brightness(1);
        }
    }

    getSize: () => number;
    stroke: GetSet<string, this>;
    strokeWidth: GetSet<number, this>;
    state: GetSet<ModuleStates, this>;
}

Factory.addGetter(CardShape, 'size', 100);

Factory.addGetterSetter(CardShape, 'stroke');
Factory.addGetterSetter(CardShape, 'strokeWidth');

Factory.addGetterSetter(CardShape, 'state', 'DEFAULT');
