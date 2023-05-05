export default class Modal {
    scene: Phaser.Scene;

    backgroundShape: Phaser.GameObjects.Rectangle;
    titleShape: Phaser.GameObjects.Text;

    lines: Phaser.GameObjects.Text[] = [];
    bottomTextShape: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        this.backgroundShape = this.scene.add.rectangle(
            this.scene.game.canvas.width / 2,
            this.scene.game.canvas.height / 2,
            500, 500, 0x000000
        )
            .setOrigin(0.5)
            .setStrokeStyle(2, 0x555555)
            .setDepth(2);
    }

    setTitle(title: string): Phaser.GameObjects.Text {
        this.titleShape = this.scene.add.text(
            this.scene.game.canvas.width / 2 - 250 + 10,
            this.scene.game.canvas.height / 2 - 250 + 10,
            title
        )
            .setDepth(3);

        return this.titleShape;
    }

    addLine(text: string): Phaser.GameObjects.Text {
        this.lines.push(
            this.scene.add.text(
                this.scene.game.canvas.width / 2 - 250 + 10,
                this.scene.game.canvas.height / 2 - 250 + 10 + 20 + this.lines.length * 20,
                text
            )
                .setDepth(3)
        );

        return this.lines[this.lines.length - 1];
    }

    setBottomText(text: string): Phaser.GameObjects.Text {
        this.bottomTextShape = this.scene.add.text(
            this.scene.game.canvas.width / 2 - 250 + 10,
            this.scene.game.canvas.height / 2 + 250 - 10,
            text
        )
            .setOrigin(0, 1)
            .setDepth(3);

        return this.bottomTextShape;
    }

    destroy() {
        if (this.titleShape !== undefined)
            this.titleShape.destroy();

        for (let shape of this.lines) {
            shape.destroy();
        }

        this.backgroundShape.destroy();

        if (this.bottomTextShape !== undefined)
            this.bottomTextShape.destroy();
    }
}