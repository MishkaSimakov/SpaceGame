import Scene from "./engine/Scene";
import {Rectangle} from "./engine/shapes/Rectangle";
import {Text} from "./engine/shapes/Text";
import Color from "@common/helpers/Color";

const offset = 10;

export default class Modal {
    scene: Scene;

    backgroundShape: Rectangle;
    titleShape: Text;
    fadeShape: Rectangle;

    lines: Text[] = [];
    bottomTextShape: Text;

    constructor(scene: Scene) {
        this.scene = scene;

        this.fadeShape = this.scene.createAndAdd.rectangle({
            fill: Color.fromHex('#000000', 0.75).toString(),
        });

        this.backgroundShape = this.scene.createAndAdd.rectangle({
            originX: 0.5,
            originY: 0.5,
            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: 2
        });

        this.update();
    }

    setTitle(title: string): Text {
        this.titleShape = this.scene.createAndAdd.text({
            text: title,
            fill: Color.WHITE.toString(),
            fontFamily: "Exo2Regular",
            fontSize: 20,
            originX: 0.5
        });

        this.update();

        return this.titleShape;
    }

    addLine(text: string): Text {
        this.lines.push(
            this.scene.createAndAdd.text({
                text: text,
                fontSize: 15,
                fill: Color.WHITE.toString(),
                fontFamily: "Exo2Regular"
            })
        );

        this.update();

        return this.lines[this.lines.length - 1];
    }

    setBottomText(text: string): Text {
        this.bottomTextShape = this.scene.createAndAdd.text({
            text: text,
            fill: Color.WHITE.toString(),
            fontFamily: "Exo2Bold",
            fontSize: 15,
            originY: 1
        });

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
            ? this.titleShape.getClientRect().bottom + offset
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
        for (const shape of this.lines) {
            shape.destroy();
        }

        this.titleShape?.destroy();
        this.backgroundShape?.destroy();
        this.fadeShape?.destroy();
        this.bottomTextShape?.destroy();
    }
}
