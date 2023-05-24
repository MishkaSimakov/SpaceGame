import * as Phaser from "phaser";

enum ButtonState {
    DEFAULT,
    HOVER,
    ACTIVE,
    DISABLED
}

type ButtonColors = { DEFAULT: number, HOVER: number, ACTIVE: number };

export default class Button {
    scene: Phaser.Scene;
    background: Phaser.GameObjects.Rectangle;
    text: Phaser.GameObjects.Text;

    state: ButtonState = ButtonState.DEFAULT;

    colors: ButtonColors;
    disabledColor = 0x716A5C;

    constructor(scene: Phaser.Scene, onClick: () => void, x: number, y: number, width: number, height: number, text: string, borderRadius: number, colors: ButtonColors, textStyle?: Phaser.Types.GameObjects.Text.TextStyle) {
        this.scene = scene;

        this.colors = colors;

        this.background = this.scene.add.rectangle(x, y, width, height)
            .setFillStyle(this.colors.DEFAULT)
            .setOrigin(0.5)
            .setInteractive();
        this.text = this.scene.add.text(x, y, text, textStyle).setOrigin(0.5);

        this.background.on('pointerover', () => {
            if (this.state === ButtonState.DISABLED)
                return;

            if (this.state == ButtonState.DEFAULT) {
                this.state = ButtonState.HOVER;
            }

            this.stateUpdated();
        });

        this.background.on('pointerout', () => {
            if (this.state === ButtonState.DISABLED)
                return;

            this.state = ButtonState.DEFAULT;

            this.stateUpdated();
        });

        this.background.on('pointerdown', () => {
            // this.state = ButtonState.ACTIVE;
            //
            // this.stateUpdated();

            onClick();
        });

        // this.background.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        //     this.state = (this.background.getBounds().contains(pointer.x, pointer.y) ? ButtonState.HOVER : ButtonState.DEFAULT);
        //     this.stateUpdated();
        //
        //     console.log("click!");
        //     onClick();
        // });
    }

    setDisabled(isDisabled: boolean) {
        if (isDisabled) {
            this.state = ButtonState.DISABLED;

            this.background.disableInteractive();
        } else {
            this.state = ButtonState.DEFAULT;

            this.background.setInteractive();
        }
    }

    stateUpdated() {
        let stateColor: Record<ButtonState, number> = {
            [ButtonState.DEFAULT]: this.colors.DEFAULT,
            [ButtonState.HOVER]: this.colors.HOVER,
            [ButtonState.ACTIVE]: this.colors.ACTIVE,
            [ButtonState.DISABLED]: this.disabledColor
        }

        this.background.setFillStyle(stateColor[this.state]);
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