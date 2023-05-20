export default class Modal {
    scene: Phaser.Scene;

    backgroundShape: Phaser.GameObjects.Rectangle;
    titleShape: Phaser.GameObjects.Text;
    fadeShape: Phaser.GameObjects.Rectangle;

    lines: Phaser.GameObjects.Text[] = [];
    bottomTextShape: Phaser.GameObjects.Text;

    textStartX: number;
    textStartY: number;

    sceneWidth: number;
    sceneHeight: number;

    offset: number;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        this.sceneWidth = this.scene.game.canvas.width;
        this.sceneHeight = this.scene.game.canvas.height;

        this.offset = 10;

        let width = Math.min(500, this.sceneWidth - 2 * this.offset);
        let height = 500;

        this.textStartX = (this.sceneWidth - width) / 2 + this.offset;

        this.backgroundShape = this.scene.add.rectangle(
            this.sceneWidth / 2,
            this.sceneHeight / 2,
            width, height,
            0x0B2545, 0.75
        )
            .setOrigin(0.5)
            .setStrokeStyle(2, 0x3D76BE)
            .setDepth(10);

        this.fadeShape = this.scene.add.rectangle(
            0, 0, this.sceneWidth, this.sceneHeight, 0x000000, 0.75
        )
            .setOrigin(0, 0)
            .setDepth(9);
    }

    setTitle(title: string): Phaser.GameObjects.Text {
        this.titleShape = this.scene.add.text(
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

    addLine(text: string): Phaser.GameObjects.Text {
        this.lines.push(
            this.scene.add.text(
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

    setBottomText(text: string): Phaser.GameObjects.Text {
        this.bottomTextShape = this.scene.add.text(
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