import Player from "../../../../common/Player";
import Button from "../Button";
import Controls from "../scenes/game/controls";
import {SIZES} from "../constants";
import Vector2 from "../../../../common/Vector2";

type ButtonData = {
    text: string, onClick: () => void, color: { DEFAULT: number, HOVER: number, ACTIVE: number }
};

export default class TopBarDrawer {
    scene: Controls;

    showPlayersData: boolean = false;
    playersDataBackground: Phaser.GameObjects.Graphics;
    playersDataText: Phaser.GameObjects.Container[] = [];
    playersDataCloseText: Phaser.GameObjects.Text;
    currentPlayerData: Phaser.GameObjects.Container;

    status: {
        text?: string,
        backgroundShape?: Phaser.GameObjects.Graphics,
        textShape?: Phaser.GameObjects.Text
    } = {};

    buttons: ButtonData[];
    buttonsShapes: Button[] = [];

    scale: number;

    players: Player[] = [];
    currentPlayer: Player;

    sizes = {
        margin: 15,
        fontSize: 15,
        padding: 7.5,
        strokeWidth: SIZES.STROKE_WIDTH,
        cornerRadius: SIZES.CORNER_RADIUS,
        sceneWidth: undefined,
        statusWidth: 400
    }

    textStyle = {
        fontFamily: 'Exo2Bold',
        fontSize: '15px',
    };

    statusStartY: number = this.sizes.margin;
    showStatusWithoutMargins: boolean;

    constructor(scene: Controls) {
        this.clearStatus();

        this.scene = scene;

        this.sizes.sceneWidth = scene.game.canvas.width;

        this.showStatusWithoutMargins = this.sizes.sceneWidth < (this.sizes.statusWidth + 2 * this.sizes.margin);

        this.scale = scene.game.canvas.width / 1440;
    }

    clearStatus() {
        this.status.text = "";

        this.redraw();
    }

    setStatus(status: string) {
        this.status.text = status;

        this.redraw();
    }

    setPlayersData(players: Player[], currentPlayer: Player) {
        this.players = players;
        this.currentPlayer = currentPlayer;

        this.redraw();
    }

    private redraw() {
        this.status.backgroundShape?.destroy();
        this.status.textShape?.destroy();
        this.currentPlayerData?.destroy();

        // clear players data background
        this.playersDataBackground?.destroy();
        this.playersDataText.forEach(t => t.destroy());
        this.playersDataCloseText?.destroy();
        this.playersDataText = [];

        // clear buttons
        for (let button of this.buttonsShapes) {
            button.destroy();
        }
        this.buttonsShapes = [];


        if (this.showPlayersData) {
            this.drawPlayersData();
        } else {
            this.drawCurrentPlayerData();
        }

        this.drawStatus();
    }

    private drawStatus() {
        if (this.status.text === "")
            return;

        let statusPosition: Vector2;

        if (this.showStatusWithoutMargins) {
            statusPosition = new Vector2(this.sizes.sceneWidth / 2, this.statusStartY + this.sizes.padding);
        } else {
            statusPosition = new Vector2(
                this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth / 2,
                this.sizes.padding + this.statusStartY
            );
        }

        this.status.textShape = this.scene.add.text(statusPosition.x, statusPosition.y, this.status.text)
            .setStyle(this.textStyle)
            .setOrigin(0.5, 0)
            .setDepth(5);

        this.drawButtons();

        let bottomY: number;

        if (this.buttonsShapes.length) {
            bottomY = this.buttonsShapes[this.buttonsShapes.length - 1].background.getBounds().bottom;
        } else {
            bottomY = this.status.textShape.getBounds().bottom;
        }

        let statusHeight = bottomY - this.status.textShape.getBounds().top + 2 * this.sizes.padding;

        this.status.backgroundShape = this.scene.add.graphics();

        this.status.backgroundShape.fillStyle(0x0B2545, 0.75);
        this.status.backgroundShape.lineStyle(this.sizes.strokeWidth, 0x3D76BE);

        if (this.showStatusWithoutMargins) {
            this.status.backgroundShape.fillRect(
                0, this.statusStartY,
                this.sizes.sceneWidth, statusHeight
            );
            this.status.backgroundShape.strokeRect(
                -this.sizes.strokeWidth / 2, -this.sizes.strokeWidth / 2,
                this.sizes.sceneWidth + this.sizes.strokeWidth, this.statusStartY + statusHeight + this.sizes.strokeWidth
            );
        } else {
            this.status.backgroundShape.fillRoundedRect(
                this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth, this.statusStartY,
                this.sizes.statusWidth, statusHeight, this.sizes.cornerRadius
            );
            this.status.backgroundShape.strokeRoundedRect(
                this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth - this.sizes.strokeWidth / 2, this.statusStartY - this.sizes.strokeWidth / 2,
                this.sizes.statusWidth + this.sizes.strokeWidth, statusHeight + this.sizes.strokeWidth,
                this.sizes.cornerRadius
            );
        }
    }

    togglePlayerCharacteristics() {
        this.showPlayersData = !this.showPlayersData;

        this.redraw();
    }

    drawCurrentPlayerData() {
        if (!this.currentPlayer)
            return;

        let textX: number;
        let textY: number;

        if (this.showStatusWithoutMargins) {
            textX = this.sizes.padding;
            textY = this.sizes.padding;
        } else {
            textX = this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth + this.sizes.padding;
            textY = this.sizes.margin + this.sizes.padding;
        }

        this.currentPlayerData = this.getPlayerStatusStringShape(this.currentPlayer, false)
            .setPosition(textX, textY)
            .on('pointerdown', () => {
                this.togglePlayerCharacteristics();
            })
            .setDepth(5);

        this.playersDataBackground = this.scene.add.graphics();

        this.playersDataBackground.fillStyle(0x0B2545, 0.75);
        this.playersDataBackground.lineStyle(this.sizes.strokeWidth, 0x3D76BE);

        let height = 2 * this.sizes.padding + this.currentPlayerData.getBounds().height;

        if (this.showStatusWithoutMargins) {
            this.playersDataBackground.fillRect(
                0, 0,
                this.sizes.sceneWidth, height
            );
            // this.playersDataBackground.strokeRect(
            //     -this.sizes.strokeWidth / 2, -this.sizes.strokeWidth / 2,
            //     this.sizes.sceneWidth + this.sizes.strokeWidth, height + this.sizes.strokeWidth
            // );

            this.playersDataBackground.lineStyle(this.sizes.strokeWidth / 2, 0x3D76BE, 0.5);
            this.playersDataBackground.lineBetween(this.sizes.padding, height, this.sizes.sceneWidth - this.sizes.padding, height)
                .setDepth(4);

            this.statusStartY = height;
        } else {
            this.playersDataBackground.fillRoundedRect(
                this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth, this.sizes.margin,
                this.sizes.statusWidth, height, this.sizes.cornerRadius
            );
            this.playersDataBackground.strokeRoundedRect(
                this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth - this.sizes.strokeWidth / 2, this.sizes.margin - this.sizes.strokeWidth / 2,
                this.sizes.statusWidth + this.sizes.strokeWidth, height + this.sizes.strokeWidth,
                this.sizes.cornerRadius
            );

            this.statusStartY = 2 * this.sizes.margin + height;
        }
    }

    drawPlayersData() {
        let lineOffset = 25;

        let textStart: Vector2;

        if (this.showStatusWithoutMargins) {
            textStart = new Vector2(
                this.sizes.padding,
                this.sizes.padding
            );
        } else {
            textStart = new Vector2(
                this.sizes.sceneWidth - this.sizes.statusWidth - this.sizes.margin + this.sizes.padding,
                this.sizes.margin + this.sizes.padding
            );
        }
        for (let [index, player] of this.players.entries()) {
            this.playersDataText.push(
                this.getPlayerStatusStringShape(player, true)
                    .setPosition(textStart.x, textStart.y + lineOffset * index)
                    .setDepth(5)
                    .on('pointerdown', () => {
                        this.scene.gameManager.spaceshipsScene.panToPlayerWithLink(player.link);
                    })
            );
        }

        this.playersDataCloseText = this.scene.add.text(textStart.x, this.playersDataText[this.playersDataText.length - 1].getBounds().bottom + lineOffset, "Закрыть")
            .setStyle(this.textStyle)
            .setOrigin(0, 1)
            .setDepth(5)
            .setInteractive()
            .on('pointerdown', () => {
                this.togglePlayerCharacteristics();
            });

        let totalTextHeight = this.playersDataCloseText.getBounds().bottom - this.playersDataText[0].getBounds().top;

        this.playersDataBackground = this.scene.add.graphics();
        let backgroundHeight = this.sizes.padding * 2 + totalTextHeight;
        let borderRadius = 10;

        this.playersDataBackground.fillStyle(0x0B2545, 0.75);
        this.playersDataBackground.lineStyle(this.sizes.strokeWidth, 0x3D76BE);

        if (this.showStatusWithoutMargins) {
            this.playersDataBackground.fillRect(
                0, 0, this.sizes.sceneWidth, backgroundHeight
            );

            this.playersDataBackground.lineStyle(this.sizes.strokeWidth / 2, 0x3D76BE, 0.5);
            this.playersDataBackground.lineBetween(this.sizes.padding, backgroundHeight, this.sizes.sceneWidth - this.sizes.padding, backgroundHeight)
                .setDepth(4);

            this.statusStartY = backgroundHeight;
        } else {
            this.playersDataBackground.fillRoundedRect(
                textStart.x - this.sizes.padding, this.sizes.margin, this.sizes.statusWidth, backgroundHeight, borderRadius
            );
            this.playersDataBackground.strokeRoundedRect(
                textStart.x - this.sizes.padding - this.sizes.strokeWidth / 2, this.sizes.margin - this.sizes.strokeWidth / 2,
                this.sizes.statusWidth + this.sizes.strokeWidth, backgroundHeight + this.sizes.strokeWidth,
                borderRadius
            );

            this.statusStartY = backgroundHeight + 2 * this.sizes.margin;
        }
    }

    addButtons(buttons: ButtonData[]) {
        this.buttons = buttons;

        this.redraw();
    }

    removeButtons() {
        this.buttons = [];

        this.redraw();
    }

    setButtonsDisabled(isDisabled: boolean) {
        this.buttonsShapes.forEach(b => b.setDisabled(isDisabled));
    }

    getPlayerStatusStringShape(player: Player, withName: boolean): Phaser.GameObjects.Container {
        let container = this.scene.add.container();
        let textStyle = {
            fontFamily: 'Exo2Bold',
            fontSize: '15px',
        };

        let startX = 0;

        if (withName) {
            container.add(
                this.scene.add.text(0, 0, (player.online ? "🔴 " : "✖️ ") + player.link + ":")
                    .setStyle(textStyle)
            );

            startX += 100;
        }

        container.add(
            this.scene.add.text(startX, 0, `${player.energy}/${player.spaceship.getTotalCapacity()} ⚡️`)
                .setStyle(textStyle)
        );

        container.add(
            this.scene.add.text(startX + 75, 0, `${player.hand.length} 🤚`)
                .setStyle(textStyle)
        );

        if (this.scene.gameManager.withTimeControl) {
            container.add(
                this.scene.add.text(startX + 150, 0, `${this.timeToString(player.time)} ⏰`)
                    .setStyle(textStyle)
            );
        }

        let offset = 10;
        container.setInteractive(
            new Phaser.Geom.Rectangle(
                -offset, -offset,
                container.getBounds().width + offset * 2, container.getBounds().height + offset * 2
            ),
            Phaser.Geom.Rectangle.Contains
        );

        return container;
    }

    private drawButtons() {
        if (!this.buttons)
            return;

        let totalWidth;

        if (this.showStatusWithoutMargins) {
            totalWidth = this.sizes.sceneWidth - 2 * this.sizes.padding;
        } else {
            totalWidth = this.sizes.statusWidth - 2 * this.sizes.padding;
        }

        let buttonWidth = (totalWidth + this.sizes.padding) / this.buttons.length - this.sizes.padding;
        let buttonHeight = 40;
        let startY: number;

        if (this.status.textShape) {
            startY = this.status.textShape.getBounds().bottom + this.sizes.padding;
        } else {
            startY = this.sizes.margin + this.sizes.margin;
        }

        let startX;
        if (this.showStatusWithoutMargins) {
            startX = this.sizes.padding;
        } else {
            startX = this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth + this.sizes.padding;
        }

        for (let [index, button] of this.buttons.entries()) {
            let buttonShape = new Button(
                this.scene, button.onClick,
                startX + index * (buttonWidth + this.sizes.padding) + buttonWidth / 2,
                startY + buttonHeight / 2,
                buttonWidth, buttonHeight,
                button.text, this.sizes.cornerRadius, button.color,
                this.textStyle
            );

            buttonShape.background.setDepth(5);
            buttonShape.text.setDepth(5);

            this.buttonsShapes.push(buttonShape);
        }
    }

    timeToString(time: number): string {
        function padWithLeadingZeros(num, totalLength) {
            return String(num).padStart(totalLength, '0');
        }

        time = Math.floor(time / 1000);

        if (time >= 0) {
            let minutes = Math.floor(time / 60);
            return minutes + ":" + padWithLeadingZeros(time - minutes * 60, 2);
        } else {
            time = -time;
            let minutes = Math.floor(time / 60);
            return "-" + minutes + ":" + padWithLeadingZeros(time - minutes * 60, 2);
        }
    }
}