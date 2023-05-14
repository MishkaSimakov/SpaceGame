import Player from "../../../common/Player";
import Button from "./Button";

export default class TopBarDrawer {
    scene: Phaser.Scene;

    backgroundShape: Phaser.GameObjects.Rectangle;

    statusShape: Phaser.GameObjects.Text;
    energyShape: Phaser.GameObjects.Text;

    buttons: Button[] = [];

    height: number;
    centerWidth: number;

    scale: number;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        this.scale = scene.game.canvas.width / 1440;

        this.height = 50 * this.scale;
        this.centerWidth = 300;
    }

    showMessage(message: string) {

    }

    clearStatus() {
        this.statusShape.setText("");
    }

    setStatus(status: string) {
        if (this.statusShape === undefined) {
            this.statusShape = this.scene.add.text(this.scene.game.canvas.width / 2, this.height / 2, status)
                .setOrigin(0.5)
                .setStyle({
                    fontFamily: 'Exo2',
                    fontSize: (25 * this.scale) + "px",
                    color: '#fff',
                });
        } else {
            this.statusShape.setText(status);
        }
    }

    setCharacteristics(player: Player) {
        let text = `${player.energy}/${player.spaceship.getTotalCapacity()} ⚡`;

        if (this.energyShape === undefined) {
            this.energyShape = this.scene.add.text(30, this.height / 2, text).setOrigin(0, 0.5)
                .setStyle({
                    fontFamily: 'Exo2',
                    fontSize: (20 * this.scale) + "px",
                    color: '#fff',
                });
        } else {
            this.energyShape.setText(text);
        }
    }

    addButtons(buttons: {
        text: string, onClick: () => void, color: { DEFAULT: number, HOVER: number, ACTIVE: number }
    }[]) {
        let offset = 15;
        let width = (this.centerWidth - offset * 2 - offset * (buttons.length - 1)) / buttons.length;

        for (let [index, button] of buttons.entries()) {
            this.buttons.push(
                new Button(
                    this.scene, button.onClick,
                    (this.scene.game.canvas.width - this.centerWidth) / 2 + offset + (width + offset) * index + width / 2, this.height + 25,
                    width, 50,
                    button.text, 10, button.color,
                    {
                        fontFamily: 'Exo2'
                    }
                )
            );
        }
    }

    removeButtons() {
        for (let button of this.buttons) {
            button.destroy();
        }

        this.buttons = [];
    }
}