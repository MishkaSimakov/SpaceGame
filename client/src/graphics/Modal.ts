import Scene from "./engine/Scene";
import Rectangle from "./engine/shapes/Rectangle";
import Text from "./engine/shapes/Text";
import Color from "./engine/types/Color";

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

        this.sceneWidth = this.scene.width;
        this.sceneHeight = this.scene.height;

        this.offset = 10;

        let width = Math.min(500, this.sceneWidth - 2 * this.offset);
        let height = 500;

        this.textStartX = (this.sceneWidth - width) / 2 + this.offset;

        this.backgroundShape = this.scene.rect(
            this.sceneWidth / 2,
            this.sceneHeight / 2,
            width, height,
        )
            .setFillStyle(Color.fromHex('#0B2545', 0.75))
            .setOrigin(0.5, 0.5)
            .setStrokeStyle(Color.fromHex('#3D76BE'), 2)

        // TODO: add depth and uncomment
            // .setDepth(10);

        this.fadeShape = this.scene.rect(0, 0, this.sceneWidth, this.sceneHeight)
            .setFillStyle(Color.fromHex('#000000', 0.75))
            .setOrigin(0, 0)

        // .setDepth(9);
    }

    setTitle(title: string): Text {
        this.titleShape = this.scene.text(
            this.sceneWidth / 2,
            this.sceneHeight / 2 - 250 + this.offset,
            title
        )
            .setFontFamily('Exo2Regular')
            .setFontSize(20)
            .setOrigin(0.5, 0)
            .setDepth(11);

        this.textStartY = this.titleShape.getBounds().bottom + this.offset;

        return this.titleShape;
    }

    addLine(text: string): Text {
        this.lines.push(
            this.scene.text(
                this.textStartX,
                this.textStartY + this.lines.length * 20,
                text
            )
                .setFontFamily('Exo2Regular')
                .setOrigin(0, 0)
                .setDepth(11)
        );

        return this.lines[this.lines.length - 1];
    }

    setBottomText(text: string): Text {
        this.bottomTextShape = this.scene.text(
            this.textStartX,
            this.sceneHeight / 2 + 250 - this.offset,
            text
        )
            .setOrigin(0, 1)
            .setDepth(11);

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
