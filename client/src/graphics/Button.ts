import * as Phaser from "phaser";

enum ButtonState {
    DEFAULT,
    HOVER,
    ACTIVE
}

export default class Button {
    scene: Phaser.Scene;
    background: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.Text;

    state: ButtonState = ButtonState.DEFAULT;

    colors: { DEFAULT: number, HOVER: number, ACTIVE: number };

    constructor(scene: Phaser.Scene, onClick: () => void, x: number, y: number, width: number, height: number, text: string, borderRadius: number, colors: { DEFAULT: number, HOVER: number, ACTIVE: number }, textStyle?: Phaser.Types.GameObjects.Text.TextStyle) {
        this.scene = scene;

        this.colors = colors;

        this.background = this.scene.add.rectangle(x, y, width, height)
            .setFillStyle(this.colors.DEFAULT)
            .setOrigin(0.5)
            .setInteractive();

        this.text = this.scene.add.text(x, y, text, textStyle).setOrigin(0.5);

        this.background.on('pointerover', () => {
            if (this.state == ButtonState.DEFAULT) {
                this.state = ButtonState.HOVER;
            }

            this.stateUpdated();
        });

        this.background.on('pointerout', () => {
            if (this.state == ButtonState.HOVER) {
                this.state = ButtonState.DEFAULT;
            }

            this.stateUpdated();
        });

        this.background.on('pointerdown', () => {
            onClick();
        });
    }

    stateUpdated() {
        if (this.state === ButtonState.DEFAULT) {
            this.background.setFillStyle(this.colors.DEFAULT);
        } else if (this.state === ButtonState.HOVER) {
            this.background.setFillStyle(this.colors.HOVER);
        }
    }

    destroy() {
        if (this.background !== undefined) {
            this.background.destroy();
        }
        if (this.text !== undefined) {
            this.text.destroy();
        }
    }
}