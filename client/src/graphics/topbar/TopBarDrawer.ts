import Player from "../../../../common/Player";
import Button from "../Button";
import Controls from "../scenes/game/controls";
import {ButtonColors, SIZES} from "../constants";
import {OtherPlayer} from "../../../../common/GameForPlayerDTO";

type ButtonData = {
    text: string, onClick: () => void, color: ButtonColors
};

export default abstract class TopBarDrawer {
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

    otherPlayers: OtherPlayer[] = [];
    currentPlayer: Player;
    playerTime: Record<number, number> = {};

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

    abstract drawStatus(): void;

    abstract drawCurrentPlayerData(): void;

    abstract drawPlayersData(): void;

    abstract drawButtons(): void;


    clearStatus() {
        this.status.text = "";

        this.redraw();
    }

    setStatus(status: string) {
        this.status.text = status;

        this.redraw();
    }

    setPlayersData(currentPlayer: Player, otherPlayers: OtherPlayer[], playerTime: Record<number, number>) {
        this.currentPlayer = currentPlayer;
        this.otherPlayers = otherPlayers;
        this.playerTime = playerTime;

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

    togglePlayerCharacteristics() {
        this.showPlayersData = !this.showPlayersData;

        this.redraw();
    }

    updateTime(playerTime: Record<number, number>) {
        this.playerTime = playerTime;

        this.redraw();
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

    getPlayerStatusStringShape(player: OtherPlayer, withName: boolean): Phaser.GameObjects.Container {
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
            this.scene.add.text(startX + 75, 0, `${player.handSize} 🤚`)
                .setStyle(textStyle)
        );

        if (this.scene.gameManager.settings.withTimeControl) {
            container.add(
                this.scene.add.text(startX + 150, 0, `${this.timeToString(this.playerTime[player.link])} ⏰`)
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