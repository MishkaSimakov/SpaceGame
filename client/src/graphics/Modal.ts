import Color from "./Color";
import {Layer} from "konva/lib/Layer";
import {Rect} from "konva/lib/shapes/Rect";
import {Text} from "konva/lib/shapes/Text";

const offset = 10;

export default class Modal {
    scene: Layer;

    backgroundShape: Rect;
    titleShape: Text;
    fadeShape: Rect;

    lines: Text[] = [];
    bottomTextShape: Text;

    constructor(scene: Layer) {
        this.scene = scene;

        this.fadeShape = new Rect({
            fill: Color.fromHex('#000000', 0.75).toString(),
        });

        this.backgroundShape = new Rect({
            originX: 0.5,
            originY: 0.5,
            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: 2
        });

        this.scene.add(this.fadeShape, this.backgroundShape);

        this.update();
    }

    setTitle(title: string): Text {
        this.titleShape = new Text({
            text: title,
            fill: "white",
            fontFamily: "Exo2Regular",
            fontSize: 20,
        });

        this.scene.add(this.titleShape);
        this.update();

        return this.titleShape;
    }

    addLine(text: string): Text {
        const line = new Text({
            text: text,
            fontSize: 15,
            fill: "white",
            fontFamily: "Exo2Regular"
        });

        this.lines.push(line);
        this.scene.add(line);

        this.update();

        return line;
    }

    setBottomText(text: string): Text {
        this.bottomTextShape = new Text({
            text: text,
            fill: "white",
            fontFamily: "Exo2Bold",
            fontSize: 15,
            originY: 1
        });

        this.scene.add(this.bottomTextShape);

        this.update();

        return this.bottomTextShape;
    }

    update() {
        const sceneWidth = this.scene.width();
        const sceneHeight = this.scene.height();

        const width = Math.min(500, sceneWidth - 2 * offset);
        const height = 500;

        const centerX = sceneWidth / 2;
        const centerY = sceneHeight / 2;

        // Update fade overlay
        this.fadeShape.setAttrs({
            width: sceneWidth,
            height: sceneHeight
        });

        // Update background
        this.backgroundShape.setAttrs({
            x: centerX,
            y: centerY,
            width,
            height
        });

        // Update title
        if (this.titleShape) {
            this.titleShape.setAttrs({
                x: centerX,
                y: centerY - height / 2 + offset
            });
        }

        const textStartY = this.titleShape
            ? this.titleShape.getClientRect().y + this.titleShape.getClientRect().height + offset
            : centerX - height / 2 + offset;

        // Update lines
        for (let i = 0; i < this.lines.length; i++) {
            this.lines[i].setAttrs({
                x: (sceneWidth - width) / 2 + offset,
                y: textStartY + i * 20
            });
        }

        // Update bottom text
        if (this.bottomTextShape) {
            this.bottomTextShape.setAttrs({
                x: (sceneWidth - width) / 2 + offset,
                y: centerY + 250 - offset
            });
        }
    }

    destroy() {
        for (let shape of this.lines) {
            shape.destroy();
        }

        this.titleShape?.destroy();
        this.backgroundShape?.destroy();
        this.fadeShape?.destroy();
        this.bottomTextShape?.destroy();
    }
}
