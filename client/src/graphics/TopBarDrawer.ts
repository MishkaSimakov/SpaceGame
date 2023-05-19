import Player from "../../../common/Player";
import Button from "./Button";
import Controls from "./scenes/game/controls";

export default class TopBarDrawer {
    scene: Controls;

    backgroundShape: Phaser.GameObjects.Rectangle;

    showPlayersCharacteristics: boolean = false;

    playersCharacteristicsBackground: Phaser.GameObjects.Graphics;
    playersCharacteristicsText: Phaser.GameObjects.Text[] = [];

    statusShape: Phaser.GameObjects.Text;
    energyShape: Phaser.GameObjects.Text;

    buttons: Button[] = [];

    height: number;
    centerWidth: number;

    scale: number;

    players: Player[] = [];

    constructor(scene: Controls) {
        this.scene = scene;

        this.scale = scene.game.canvas.width / 1440;

        this.height = 50 * this.scale;
        this.centerWidth = 300;
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
                    fontSize: Math.max(25 * this.scale, 20) + "px",
                });
        } else {
            this.statusShape.setText(status);
        }
    }

    setCharacteristics(players: Player[], currentPlayer: Player) {
        this.players = players;

        let text = `${currentPlayer.energy}/${currentPlayer.spaceship.getTotalCapacity()} ⚡`;

        if (this.energyShape === undefined) {
            this.energyShape = this.scene.add.text(30, this.height / 2, text).setOrigin(0, 0.5)
                .setStyle({
                    fontFamily: 'Exo2',
                    fontSize: Math.max(20 * this.scale, 15) + "px",
                })
                .setInteractive()
                .on('pointerdown', () => {
                    this.showPlayersCharacteristics = !this.showPlayersCharacteristics;

                    this.destroyPlayersCharacteristics();

                    if (this.showPlayersCharacteristics) {
                        this.energyShape.destroy();
                        this.drawPlayersCharacteristics();
                    }
                });
        } else {
            this.energyShape.setText(text);
        }
    }

    destroyPlayersCharacteristics() {
        if (this.playersCharacteristicsBackground)
            this.playersCharacteristicsBackground.destroy();

        for (let text of this.playersCharacteristicsText) {
            text.destroy();
        }
        this.playersCharacteristicsText = [];
    }

    drawPlayersCharacteristics() {
        let sceneWidth = this.scene.game.canvas.width;
        let margin = 30 * this.scale;
        let padding = margin * 0.5;

        let fontSize = Math.max(20 * this.scale, 15);
        let lineOffset = fontSize * 1.25;
        let totalTextWidth = 0;

        for (let [index, player] of this.players.entries()) {
            let text = this.scene.add.text(
                margin + padding, margin + padding + lineOffset * index,
                `${player.link}: ${player.energy}/${player.spaceship.getTotalCapacity()} ⚡`
            ).setStyle({
                fontFamily: 'Exo2',
                fontSize: fontSize + 'px',
            }).setDepth(4);

            totalTextWidth = Math.max(totalTextWidth, text.getBounds().width);

            this.playersCharacteristicsText.push(text);
        }

        let totalTextHeight = this.playersCharacteristicsText[this.playersCharacteristicsText.length - 1].getBounds().bottom - this.playersCharacteristicsText[0].getBounds().top;

        let width = totalTextWidth + padding * 2;
        if (sceneWidth < 660) {
            width = sceneWidth - margin * 2;
        }

        this.playersCharacteristicsBackground = this.scene.add.graphics();
        let strokeWidth = 10 * this.scale;
        let backgroundHeight = padding * 2 + totalTextHeight;
        let borderRadius = 10;

        this.playersCharacteristicsBackground.fillStyle(0x0B2545, 0.75);
        this.playersCharacteristicsBackground.lineStyle(strokeWidth, 0x3D76BE);

        this.playersCharacteristicsBackground.fillRoundedRect(
            margin, margin, width, backgroundHeight, borderRadius
        );
        this.playersCharacteristicsBackground.strokeRoundedRect(
            margin - strokeWidth / 2, margin - strokeWidth / 2,
            width + strokeWidth, backgroundHeight + strokeWidth,
            borderRadius
        );
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