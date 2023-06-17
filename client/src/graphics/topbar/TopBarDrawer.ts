import Player from "../../../../common/Player";
import Controls from "../scenes/controls";
import {ButtonColors, SIZES} from "../constants";
import {OtherPlayer} from "../../../../common/GameForPlayerDTO";
import {Message} from "../../../../common/Types";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import {Group} from "../engine/Group";
import {Button} from "../shapes/Button";
import {PlayerDataLine} from "../shapes/PlayerDataLine";

type ButtonData = {
    text: string, onClick: () => void, color: ButtonColors
};

export default abstract class TopBarDrawer {
    scene: Controls;

    group: Group;

    showPlayersData: boolean = false;
    playersDataBackground: Rectangle;
    playersDataText: Map<number, PlayerDataLine> = new Map<number, PlayerDataLine>();
    playersDataCloseText: Text;
    currentPlayerData: PlayerDataLine;

    status: {
        context?: string,
        contextColor?: string,
        contextShape?: Text,

        text?: string,
        backgroundShape?: Rectangle,
        textShape?: Text
    } = {};

    buttons: ButtonData[] = [];
    buttonsGroup: Group;

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

        this.group = new Group();

        this.scene.add(this.group);

        this.sizes.sceneWidth = scene.width();

        this.scale = scene.width() / 1440;
    }

    abstract drawStatus(): void;

    abstract drawCurrentPlayerData(): void;

    abstract drawPlayersData(): void;

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
        this.playersDataText.clear();

        // clear buttons
        this.buttonsGroup?.destroy();

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

        for (let key in playerTime) {
            const id = parseInt(key);

            if (this.playersDataText.has(id)) {
                this.playersDataText.get(id).time(this.playerTime[id]);
            }

            if (id === this.currentPlayer.id) {
                this.currentPlayerData.time(this.playerTime[id])
            }
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
        this.buttonsGroup.children.forEach(b => {
            (b as Button).disabled(isDisabled);
        });
    }

    getMessageShape(message: Message): Group {
        return this.scene.createAndAdd.group();
    }

    getButtonsGroup(width: number): Group {
        let group = new Group({
            width: width
        });

        if (!this.buttons)
            return group;

        let buttonWidth = (width + this.sizes.padding) / this.buttons.length - this.sizes.padding;
        let buttonHeight = 40;

        for (let [index, button] of this.buttons.entries()) {
            let buttonShape = new Button({
                x: index * (buttonWidth + this.sizes.padding),
                y: 0,
                width: buttonWidth,
                height: buttonHeight,
                text: button.text,
                fill: button.color.DEFAULT.toString(),
                hoverFill: button.color.HOVER.toString(),
                activeFill: button.color.ACTIVE.toString()
            })
                .on('click', button.onClick);

            group.add(buttonShape);
        }

        return group;
    }
}
