import Player from "../../../../common/Player";
import Button from "../Button";
import Controls from "../scenes/game/controls";
import {SIZES} from "../constants";

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

    currentTime: number = 123;

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

    constructor(scene: Controls) {
        this.clearStatus();

        this.scene = scene;

        this.sizes.sceneWidth = scene.game.canvas.width;

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
        // if (this.showPlayersData) {
        //     this.drawPlayersData();
        // } else {
        //     this.drawCurrentPlayerData();
        // }
        //
        // this.drawStatus();
    }

    private drawStatus() {
        this.status.backgroundShape?.destroy();
        this.status.textShape?.destroy();

        if (this.status.text === "")
            return;

        this.status.textShape = this.scene.add.text(
            this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth / 2,
            this.sizes.padding + this.statusStartY,
            this.status.text
        )
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

    togglePlayerCharacteristics() {
        this.showPlayersData = !this.showPlayersData;

        this.redraw();
    }

    drawCurrentPlayerData() {
        if (!this.currentPlayer)
            return;

        this.currentPlayerData?.destroy();

        let margin = 10;

        this.currentPlayerData = this.getPlayerStatusStringShape(this.currentPlayer, false)
            .setPosition(margin, margin)
            .on('pointerdown', () => {
                this.togglePlayerCharacteristics();
            });

        // if (this.scene.game.canvas.width < )
    }

    drawPlayersData() {
        this.playersDataBackground?.destroy();
        this.playersDataText.forEach(t => t.destroy());
        this.playersDataCloseText?.destroy();
        this.playersDataText = [];

        let sceneWidth = this.scene.game.canvas.width;

        let lineOffset = 25;

        let textStartY = this.sizes.margin + this.sizes.padding;
        let textStartX = this.sizes.sceneWidth - this.sizes.statusWidth - this.sizes.margin + this.sizes.padding;

        for (let [index, player] of this.players.entries()) {
            this.playersDataText.push(
                this.getPlayerStatusStringShape(player, true)
                    .setPosition(textStartX, textStartY + lineOffset * index)
                    .setDepth(4)
                    .on('pointerdown', () => {
                        this.scene.gameManager.spaceshipsScene.panToPlayerWithLink(player.link);
                    })
            );
        }

        this.playersDataCloseText = this.scene.add.text(textStartX, this.playersDataText[this.playersDataText.length - 1].getBounds().bottom + lineOffset, "Закрыть")
            .setStyle(this.textStyle)
            .setOrigin(0, 1)
            .setDepth(4)
            .setInteractive()
            .on('pointerdown', () => {
                this.togglePlayerCharacteristics();
            });

        let totalTextHeight = this.playersDataCloseText.getBounds().bottom - this.playersDataText[0].getBounds().top;
        let totalTextWidth = Math.max(...this.playersDataText.map(t => t.getBounds().width));

        this.playersDataBackground = this.scene.add.graphics();
        let backgroundHeight = this.sizes.padding * 2 + totalTextHeight;
        let borderRadius = 10;

        this.playersDataBackground.fillStyle(0x0B2545, 0.75);
        this.playersDataBackground.lineStyle(this.sizes.strokeWidth, 0x3D76BE);

        this.playersDataBackground.fillRoundedRect(
            textStartX - this.sizes.padding, this.sizes.margin, this.sizes.statusWidth, backgroundHeight, borderRadius
        );
        this.playersDataBackground.strokeRoundedRect(
            textStartX - this.sizes.padding - this.sizes.strokeWidth / 2, this.sizes.margin - this.sizes.strokeWidth / 2,
            this.sizes.statusWidth - this.sizes.strokeWidth, backgroundHeight + this.sizes.strokeWidth,
            borderRadius
        );

        this.statusStartY = backgroundHeight + 2 * this.sizes.margin;
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
            this.scene.add.text(startX + 75, 0, `${this.timeToString(this.currentTime)} ⏰`)
                .setStyle(textStyle)
        );

        container.add(
            this.scene.add.text(startX + 150, 0, `${player.hand.length} 🤚`)
                .setStyle(textStyle)
        );

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
        for (let button of this.buttonsShapes) {
            button.destroy();
        }
        this.buttonsShapes = [];

        if (!this.buttons)
            return;

        let totalWidth = this.sizes.statusWidth - 2 * this.sizes.padding;

        let buttonWidth = (totalWidth + this.sizes.padding) / this.buttons.length - this.sizes.padding;
        let buttonHeight = 40;
        let startY: number;

        if (this.status.textShape) {
            startY = this.status.textShape.getBounds().bottom + this.sizes.padding;
        } else {
            startY = this.sizes.margin + this.sizes.margin;
        }

        let startX = this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth + this.sizes.padding;

        for (let [index, button] of this.buttons.entries()) {
            let buttonShape = new Button(
                this.scene, button.onClick,
                startX + index * (buttonWidth + this.sizes.padding) + buttonWidth / 2,
                startY + buttonHeight / 2,
                buttonWidth, buttonHeight,
                "Строительства", this.sizes.cornerRadius, button.color,
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