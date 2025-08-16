import Module from "@common/modules/Module";

import Color from "../Color";

import {Group, GroupConfig} from "konva/lib/Group";
import {Rect} from "konva/lib/shapes/Rect";
import {Text} from "konva/lib/shapes/Text";


export type ModuleStates = 'DEFAULT' | 'ENABLED' | 'DISABLED' | 'PROTECTED' | 'SELECTED';

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

export class ModuleShape extends Group {
    module: Module;
    _rotationGroup: Group;
    _background: Rect;
    _strokeRect: Rect;
    _title: Text;
    _values: Text;
    _connectors: Rect[] = [];
    _hitRect: Rect;

    constructor(module: Module, size: number) {
        super();

        this.module = module;

        const initialSize = 256;
        const baseConnectorWidth = 100;
        const baseConnectorHeight = 20;

        const blueColor = Color.fromHex('#4343F4').toString();
        const redColor = Color.fromHex('#EA4035').toString();

        const color = getModuleColor(module.health, module.totalHealth);

        this._rotationGroup = new Group({
            width: initialSize,
            height: initialSize
        });

        const offset = 10;
        this._background = new Rect({
            width: initialSize - offset * 2,
            height: initialSize - offset * 2,
            x: offset,
            y: offset,
            fill: color.toString(),
            cornerRadius: 5
        });

        this._strokeRect = new Rect({
            width: initialSize,
            height: initialSize,
            x: 0,
            y: 0,
            fill: Color.transparent().toString(),
        });

        const titleFontSize = 25;
        this._title = new Text({
            x: initialSize / 2,
            y: initialSize / 2,
            fontFamily: "Exo2Bold",
            fontSize: titleFontSize,
            fill: "white",
            align: 'center',
            text: module.name
        });

        const titleWidth = this._title.getWidth();
        if (titleWidth > initialSize - 20) {
            this._title.fontSize(titleFontSize * (initialSize - 20) / titleWidth);
        }

        this.add(this._background, this._title);

        this.add(this._rotationGroup);

        this._values = new Text({
            x: initialSize / 2,
            y: initialSize * 3 / 4,
            fontFamily: "Exo2Bold",
            fontSize: 15,
            fill: "white",
            originX: 0.5,
            originY: 0.5,
            text: this.getCharacteristicsString()
        });

        if (module.connectors.top) {
            this._connectors.push(new Rect({
                x: initialSize / 2,
                y: -1,
                originX: 0.5,
                width: baseConnectorWidth,
                height: baseConnectorHeight + 1,
                fill: module.connectors.top === 1 ? blueColor : redColor,
                cornerRadius: [0, 0, 10, 10]
            }));
        }

        if (module.connectors.left) {
            this._connectors.push(new Rect({
                x: -1,
                y: initialSize / 2,
                originY: 0.5,
                width: baseConnectorHeight + 1,
                height: baseConnectorWidth,
                fill: module.connectors.left === 1 ? blueColor : redColor,
                cornerRadius: [0, 10, 10, 0]
            }));
        }

        if (module.connectors.bottom) {
            this._connectors.push(new Rect({
                x: initialSize / 2,
                y: initialSize + 1,
                originY: 1,
                originX: 0.5,
                width: baseConnectorWidth,
                height: baseConnectorHeight + 1,
                fill: module.connectors.bottom === 1 ? blueColor : redColor,
                cornerRadius: [10, 10, 0, 0]
            }));
        }

        if (module.connectors.right) {
            this._connectors.push(new Rect({
                x: initialSize + 1,
                y: initialSize / 2,
                originX: 1,
                originY: 0.5,
                width: baseConnectorHeight + 1,
                height: baseConnectorWidth,
                fill: module.connectors.right === 1 ? blueColor : redColor,
                cornerRadius: [10, 0, 0, 10]
            }));
        }

        this._rotationGroup.add(...this._connectors);

        this._rotationGroup.rotation(module.rotation * (Math.PI / 2));

        this.add(this._values);

        this._hitRect = new Rect({
            x: -1,
            y: -1,
            width: initialSize + 2,
            height: initialSize + 2,
            visible: false
        });

        this.add(this._strokeRect);
        this.add(this._hitRect);

        this.width(initialSize);
        this.height(initialSize);

        this.scaleX(size / initialSize).scaleY(size / initialSize);
    }

    rotateCard(rotation) {
        this._rotationGroup.rotation(rotation);
    }

    private getCharacteristicsString(): string {
        let values = '';

        values += this.module.health + '/' + this.module.totalHealth + '❤️';

        if (this.module.strength)
            values += ' ' + this.module.strength + '🎯';

        if (this.module.capacity)
            values += ' ' + this.module.capacity + '🔋';

        if (this.module.energyIncrease)
            values += ' +' + this.module.energyIncrease + '⚡️';

        if (this.module.energyCost)
            values += ' -' + this.module.energyCost + '⚡️'

        return values;
    }

    setStroke(color: string): ModuleShape {
        this._strokeRect.stroke(color);

        return this;
    }

    setStrokeWidth(width: number): ModuleShape {
        this._strokeRect.strokeWidth(width);

        return this;
    }

    setState(state: ModuleStates): ModuleShape {
        // const currState = this.state();
        //
        // if (currState === 'ENABLED' && state === 'DISABLED')
        //     return this;
        //
        // this._hitRect.visible(state !== 'DEFAULT' && state !== 'ENABLED');
        //
        // this.setAttr('state', state);
        //
        // this.updateStateColor();

        return this;
    }

    //
    // setDisabledColor(color
    //                  :
    //                  string
    // ):
    //     Card {
    //     this.setAttr('disabledColor', color);
    //
    //     this.updateStateColor();
    //
    //     return this;
    // }
    //
    // private
    //
    // updateStateColor() {
    //     const state = this.state();
    //
    //     if (state === 'DISABLED') {
    //         this._hitRect.fill(this.disabledColor());
    //     }
    // }
}
