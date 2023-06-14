import Player from "../../../../common/Player";
import Controls from "../scenes/controls";
import {ButtonColors, SIZES} from "../constants";
import {OtherPlayer} from "../../../../common/GameForPlayerDTO";
import {Message} from "../../../../common/Types";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import {Group} from "../engine/Group";
import {Button} from "../shapes/Button";

type ButtonData = {
    text: string, onClick: () => void, color: ButtonColors
};

export default abstract class TopBarDrawer {
    scene: Controls;

    showPlayersData: boolean = false;
    playersDataBackground: Rectangle;
    playersDataText: Group[] = [];
    playersDataCloseText: Text;
    currentPlayerData: Group;

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
        padding: 10,
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
    messagesShape: Group[] = [];
    hiddenMessageId: number;

    constructor(scene: Controls) {
        this.scene = scene;

        this.sizes.sceneWidth = scene.width();

        console.log(scene.width());

        this.scale = scene.width() / 1440;
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
        this.buttonsShapes.forEach(b => b.disabled(isDisabled));
    }

    getPlayerStatusStringShape(player: OtherPlayer, withName: boolean): Group {
        let container = new Group();

        let startX = 0;

        if (withName) {
            container.add(
                new Text({
                    x: 0,
                    y: 0,
                    text: (player.online ? "🔴 " : "✖️ ") + player.name + ":",
                    fontFamily: "Exo2Bold",
                    fontSize: 15,
                    fill: "white"
                })
            );

            startX += 150;
        }

        container.add(
            new Text({
                x: startX,
                y: 0,
                text: `${player.energy}/${player.spaceship.getTotalCapacity()} ⚡️`,
                fontFamily: "Exo2Bold",
                fontSize: 15,
                fill: "white"
            })
        );

        container.add(
            new Text({
                x: startX + 75,
                y: 0,
                text: `${player.handSize} 🤚`,
                fontFamily: "Exo2Bold",
                fontSize: 15,
                fill: "white"
            })
        );

        if (this.scene.gameManager.settings.withTimeControl) {
            container.add(
                new Text({
                    x: startX + 150,
                    y: 0,
                    text: `${this.timeToString(this.playerTime[player.id])} ⏰`,
                    fontFamily: "Exo2Bold",
                    fontSize: 15,
                    fill: "white"
                })
            );
        }

        return container;
    }

    getMessageShape(message: Message): Group {
       return this.scene.createAndAdd.group();
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
