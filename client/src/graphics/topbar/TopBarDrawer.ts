import {OtherPlayer} from "@common/GameForPlayerDTO";
import Player, {PlayerId} from "@common/Player";
import {Message} from "@common/Types";

import Controls from "../scenes/Controls";
import {ButtonColors, SIZES} from "../constants";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import {Group} from "../engine/Group";
import {Button} from "../shapes/Button";
import {PlayerDataLine} from "../shapes/PlayerDataLine";
import TopBarSmallAdaptor from "./TopBarSmallAdaptor";
import TopBarDefaultAdaptor from "./TopBarDefaultAdaptor";

type ButtonData = {
    text: string, onClick: () => void, color: ButtonColors
};

export default class TopBarDrawer {
    scene: Controls;

    group: Group;

    showPlayersData: boolean = false;
    playersDataBackground: Rectangle;
    playersDataText: Map<number, PlayerDataLine> = new Map<number, PlayerDataLine>();
    playersDataCloseText: Text;
    currentPlayerData: PlayerDataLine;

    status: {
        text?: string,
        backgroundShape?: Rectangle,
        textShape?: Text
    } = {};

    messagesGroup: Group;

    buttons: ButtonData[] = [];
    buttonsGroup: Group;

    otherPlayers: OtherPlayer[] = [];
    currentPlayer: Player;
    onlineMap: Record<PlayerId, boolean> = {};
    playerTime: Record<number, number> = {};

    sizes = {
        margin: 15,
        fontSize: 15,
        padding: 10,
        strokeWidth: SIZES.STROKE_WIDTH,
        cornerRadius: SIZES.CORNER_RADIUS,
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

    constructor(scene: Controls) {
        this.scene = scene;

        this.group = new Group();

        this.scene.add(this.group);
    }

    clearStatus() {
        this.status.text = "";

        this.redraw();
    }

    setMessages(messages: Message[]) {
        this.messages = messages;

        this.redraw();
    }

    setStatus(status: string) {
        this.status.text = status;

        this.redraw();
    }

    setPlayersData(currentPlayer: Player, otherPlayers: OtherPlayer[], onlineMap: Record<PlayerId, boolean>, playerTime: Record<number, number>, messages: Message[]) {
        this.currentPlayer = currentPlayer;
        this.otherPlayers = otherPlayers;
        this.onlineMap = onlineMap;
        this.playerTime = playerTime;
        this.messages = messages;

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

        this.messagesGroup?.destroy();

        const sceneWidth = this.scene.width();
        const adaptor = sceneWidth < (400 + 2 * 15)
            ? new TopBarSmallAdaptor()
            : new TopBarDefaultAdaptor();

        if (this.showPlayersData) {
            adaptor.drawPlayersData(this, sceneWidth);
        } else {
            adaptor.drawCurrentPlayerData(this, sceneWidth);
        }

        adaptor.drawStatus(this, sceneWidth);

        // adaptor.drawMessages(this);
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

    getMessagesGroup(width: number, messagesCount: number): Group {
        const messagesGroup = new Group({
            width: width
        });

        const messages = this.messages.slice(-messagesCount);

        let messagesString = messages.map(message => {
            return (message.playerId ?? 'Игра') + ': ' + message.text;
        }).join('\n');

        messagesGroup.add(new Text({
            x: 0,
            y: 0,
            text: messagesString,
            fontFamily: "Exo2Regular",
            fill: "white"
        }));

        return messagesGroup;
    }
}
