import Player from "../../../common/Player";
import Button from "./Button";
import Controls from "./scenes/game/controls";
import {clamp, SIZES} from "./constants";

type ButtonData = {
    text: string, onClick: () => void, color: { DEFAULT: number, HOVER: number, ACTIVE: number }
};

export default class TopBarDrawer {
    scene: Controls;

    showPlayersCharacteristics: boolean = false;
    playersCharacteristicsBackground: Phaser.GameObjects.Graphics;
    playersCharacteristicsText: Phaser.GameObjects.Text[] = [];
    playersCharacteristicsBottom: number = 0;

    status: string;
    statusShape: Phaser.GameObjects.Text;
    energyShape: Phaser.GameObjects.Text;

    buttons: ButtonData[];
    buttonsShapes: Button[] = [];

    spaceAvailableForStatus: number;

    scale: number;

    players: Player[] = [];

    constructor(scene: Controls) {
        this.clearStatus();

        this.scene = scene;

        this.scale = scene.game.canvas.width / 1440;
    }

    clearStatus() {
        this.status = "";
        this.statusShape?.destroy();
    }

    setStatus(status: string) {
        this.status = status;

        this.drawStatus();
    }

    private drawStatus() {
        let margin = 10;
        let statusY = margin + (this.scene.game.canvas.width < 600 ? this.playersCharacteristicsBottom : 0);
        let fontSize = 20;
        let statusWidth = fontSize * this.status.length * 0.56;

        // console.log(statusWidth)
        if (statusWidth > this.scene.game.canvas.width - 2 * margin) {
            fontSize = (this.scene.game.canvas.width - 2 * margin) / (this.status.length * 0.56);
        }

        this.statusShape?.destroy();
        this.statusShape = this.scene.add.text(this.scene.game.canvas.width / 2, statusY, this.status)
            .setOrigin(0.5, 0)
            .setStyle({
                fontFamily: 'Exo2Bold',
                fontSize: fontSize + "px",
            });

        console.log(this.statusShape.getBounds().height / fontSize)
    }

    setCharacteristics(players: Player[], currentPlayer: Player) {
        this.players = players;

        if (this.showPlayersCharacteristics) {
            this.drawPlayersCharacteristics();

            return;
        }

        let margin = 10;
        let text = `${currentPlayer.energy}/${currentPlayer.spaceship.getTotalCapacity()} ⚡`;

        if (this.energyShape === undefined) {
            this.energyShape = this.scene.add.text(margin, margin, text).setOrigin(0)
                .setStyle({
                    fontFamily: 'Exo2Bold',
                    fontSize: "15px",
                })
                .setInteractive()
                .on('pointerdown', () => {
                    this.togglePlayerCharacteristics();
                });
        } else {
            this.energyShape.setText(text);
        }
    }

    togglePlayerCharacteristics() {
        this.showPlayersCharacteristics = !this.showPlayersCharacteristics;

        this.destroyPlayersCharacteristics();

        if (this.showPlayersCharacteristics) {
            this.energyShape.destroy();
            this.drawPlayersCharacteristics();

            this.drawStatus();
            this.drawButtons();
        }
    }

    destroyPlayersCharacteristics() {
        this.playersCharacteristicsBackground?.destroy();

        for (let text of this.playersCharacteristicsText) {
            text.destroy();
        }
        this.playersCharacteristicsText = [];
    }

    drawPlayersCharacteristics() {
        if (!this.showPlayersCharacteristics)
            return;

        this.playersCharacteristicsBackground?.destroy();
        this.playersCharacteristicsText.forEach(t => t.destroy());

        let sceneWidth = this.scene.game.canvas.width;
        let margin = 15;
        let padding = margin * 0.5;

        let fontSize = Math.max(20 * this.scale, 15);
        let lineOffset = fontSize * 1.25;
        let totalTextWidth = 0;

        let showFullWidth = sceneWidth < 600;

        for (let [index, player] of this.players.entries()) {
            let text = this.scene.add.text(
                margin + padding, margin + padding + lineOffset * index,
                `${player.link}: ${player.energy}/${player.spaceship.getTotalCapacity()} ⚡`
            )
                .setStyle({
                    fontFamily: 'Exo2Bold',
                    fontSize: fontSize + 'px',
                })
                .setDepth(4)
                .setInteractive()
                .on('pointerdown', () => {
                    this.scene.gameManager.spaceshipsScene.panToPlayerWithLink(player.link);
                });

            totalTextWidth = Math.max(totalTextWidth, text.getBounds().width);

            this.playersCharacteristicsText.push(text);
        }

        let totalTextHeight = this.playersCharacteristicsText[this.playersCharacteristicsText.length - 1].getBounds().bottom - this.playersCharacteristicsText[0].getBounds().top;

        let width = totalTextWidth + padding * 2;
        if (showFullWidth) {
            width = sceneWidth - margin * 2;
        }

        this.playersCharacteristicsBackground = this.scene.add.graphics();
        let strokeWidth = SIZES.STROKE_WIDTH;
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

        this.playersCharacteristicsBottom = backgroundHeight + margin + strokeWidth / 2;
    }

    addButtons(buttons: ButtonData[]) {
        this.buttons = buttons;

        this.drawButtons();
    }

    removeButtons() {
        for (let button of this.buttonsShapes) {
            button.destroy();
        }

        this.buttons = [];
        this.buttonsShapes = [];
    }

    setButtonsVisible(visible: boolean) {
        this.buttonsShapes.forEach(b => b.setVisible(visible));
    }

    private drawButtons() {
        for (let button of this.buttonsShapes) {
            button.destroy();
        }
        this.buttonsShapes = [];

        if (!this.buttons)
            return;

        let sceneWidth = this.scene.game.canvas.width;
        let spaceBetween = 15;
        let totalWidth = Math.min(600 * this.scale, 300);

        if (sceneWidth < 600) {
            totalWidth = sceneWidth - 2 * spaceBetween;
        }

        let buttonWidth = (totalWidth - spaceBetween * (this.buttons.length - 1)) / this.buttons.length;
        let buttonHeight = 40;
        let startX = (sceneWidth - totalWidth) / 2;
        let startY = 10;

        if (this.statusShape) {
            startY += this.statusShape.getBounds().bottom;
        }

        for (let [index, button] of this.buttons.entries()) {
            this.buttonsShapes.push(
                new Button(
                    this.scene, button.onClick,
                    startX + index * (buttonWidth + spaceBetween) + buttonWidth / 2, startY + buttonHeight / 2,
                    buttonWidth, buttonHeight,
                    button.text, 10, button.color,
                    {
                        fontFamily: 'Exo2Bold',
                        fontSize: '15px'
                    }
                )
            );
        }
    }
}