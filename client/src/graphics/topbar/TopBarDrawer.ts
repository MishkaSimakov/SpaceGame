import Player from "../../../../common/Player";
import Controls from "../scenes/controls";
import {ButtonColors, SIZES} from "../constants";
import {OtherPlayer} from "../../../../common/GameForPlayerDTO";
import {Message} from "../../../../common/Types";
import Rectangle from "../engine/shapes/Rectangle";
import Container from "../engine/shapes/Container";
import Text from "../engine/shapes/Text";
import Button from "../engine/shapes/Button";
import Color from "../engine/types/Color";

type ButtonData = {
    text: string, onClick: () => void, color: ButtonColors
};

export default abstract class TopBarDrawer {
    scene: Controls;

    showPlayersData: boolean = false;
    playersDataBackground: Rectangle;
    playersDataText: Container[] = [];
    playersDataCloseText: Text;
    currentPlayerData: Container;

    status: {
        context?: string,
        contextColor?: string,
        contextShape?: Text,

        text?: string,
        backgroundShape?: Rectangle,
        textShape?: Text
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
    messagesStartY: number = this.sizes.margin;

    messages: Message[] = [];
    messagesShape: Container[] = [];
    hiddenMessageId: number;

    constructor(scene: Controls) {
        this.scene = scene;

        this.sizes.sceneWidth = scene.width;

        this.scale = scene.width / 1440;
    }

    abstract drawStatus(): void;

    abstract drawCurrentPlayerData(): void;

    abstract drawPlayersData(): void;

    abstract drawButtons(): void;

    abstract drawMessages(): void;

    clearStatus() {
        this.status.text = "";

        this.redraw();
    }

    setMessages(messages: Message[]) {
        this.messages = messages;

        this.redraw();
    }

    setStatus(status: string, context?: string, contextColor?: string) {
        this.status.text = status;
        this.status.context = context;
        this.status.contextColor = contextColor;

        this.redraw();
    }

    setPlayersData(currentPlayer: Player, otherPlayers: OtherPlayer[], playerTime: Record<number, number>) {
        this.currentPlayer = currentPlayer;
        this.otherPlayers = otherPlayers;
        this.playerTime = playerTime;

        this.redraw();
    }

    private redraw() {
        this.messagesShape.forEach(s => s.destroy());
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

        this.drawMessages();
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

    getPlayerStatusStringShape(player: OtherPlayer, withName: boolean): Container {
        let container = this.scene.container();

        let startX = 0;

        if (withName) {
            container.add(
                this.scene.text(0, 0, (player.online ? "🔴 " : "✖️ ") + player.name + ":")
                    .setFontFamily('Exo2Bold')
                    .setFontSize(15)
                    .setFillStyle(Color.WHITE)
            );

            startX += 150;
        }

        container.add(
            this.scene.text(startX, 0, `${player.energy}/${player.spaceship.getTotalCapacity()} ⚡️`)
                .setFontFamily('Exo2Bold')
                .setFontSize(15)
                .setFillStyle(Color.WHITE)
        );

        container.add(
            this.scene.text(startX + 75, 0, `${player.handSize} 🤚`)
                .setFontFamily('Exo2Bold')
                .setFontSize(15)
                .setFillStyle(Color.WHITE)
        );

        if (this.scene.gameManager.settings.withTimeControl) {
            container.add(
                this.scene.text(startX + 150, 0, `${this.timeToString(this.playerTime[player.id])} ⏰`)
                    .setFontFamily('Exo2Bold')
                    .setFontSize(15)
                    .setFillStyle(Color.WHITE)
            );
        }

        return container;
    }

    getMessageShape(message: Message): Container {
        let container = this.scene.container();

        container.add(
            this.scene.text(0, 0, (message.playerId ?? 'ИИ') + ":")
                .setFontFamily('Exo2Regular')
                .setFontSize(12)
                .setFillStyle(Color.WHITE)
        );

        container.add(
            this.scene.text(50, 0, message.text)
                .setFontFamily('Exo2Regular')
                .setFontSize(12)
                .setFillStyle(Color.WHITE)
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
