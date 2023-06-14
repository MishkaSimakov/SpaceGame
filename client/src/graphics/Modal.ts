import Scene from "./engine/Scene";
import {Rectangle} from "./engine/shapes/Rectangle";
import {Text} from "./engine/shapes/Text";
import Color from "./Color";

export default class Modal {
    scene: Scene;

    backgroundShape: Rectangle;
    titleShape: Text;
    fadeShape: Rectangle;

    lines: Text[] = [];
    bottomTextShape: Text;

    textStartX: number;
    textStartY: number;

    sceneWidth: number;
    sceneHeight: number;

    offset: number;

    constructor(scene: Scene) {
        this.scene = scene;

        this.sceneWidth = this.scene.width();
        this.sceneHeight = this.scene.height();

        this.offset = 10;

        let width = Math.min(500, this.sceneWidth - 2 * this.offset);
        let height = 500;

        this.textStartX = (this.sceneWidth - width) / 2 + this.offset;

        this.backgroundShape = this.scene.createAndAdd.rectangle({
            x: this.sceneWidth / 2,
            y: this.sceneHeight / 2,
            width, height,
            originX: 0.5,
            originY: 0.5,
            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: 2
        })

        this.fadeShape = this.scene.createAndAdd.rectangle({
            x: 0,
            y: 0,
            width: this.sceneWidth,
            height: this.sceneHeight,
            fill: Color.fromHex('#000000', 0.75).toString(),
        });
    }

    setTitle(title: string): Text {
        this.titleShape = this.scene.createAndAdd.text({
            x: this.sceneWidth / 2,
            y: this.sceneHeight / 2 - 250 + this.offset,
            text: title,
            fontFamily: "Exo2Regular",
            fontSize: 20,
            originX: 0.5
        });

        this.textStartY = this.titleShape.getClientRect().bottom + this.offset;

        return this.titleShape;
    }

    addLine(text: string): Text {
        this.lines.push(
            this.scene.createAndAdd.text({
                x: this.textStartX,
                y: this.textStartY + this.lines.length * 20,
                text,
                fontFamily: "Exo2Regular"
            })
        );

        return this.lines[this.lines.length - 1];
    }

    setBottomText(text: string): Text {
        this.bottomTextShape = this.scene.createAndAdd.text({
            x: this.textStartX,
            y: this.sceneHeight / 2 + 250 - this.offset,
            text,
            originY: 1
        });

        this.updateBackground();

        return this.bottomTextShape;
    }

    updateBackground() {
        // this.backgroundShape.setSize(
        //     this.backgroundShape.width,
        //     this.
        // );
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
