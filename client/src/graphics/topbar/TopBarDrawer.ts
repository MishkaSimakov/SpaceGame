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
import TopBarDefaultAdaptor from "./TopBarDefaultAdaptor";
import Color from "../Color";

export type ButtonData = {
    text: string,
    onClick: () => void,
    color: ButtonColors,
    name?: string
};

export default class TopBarDrawer {
    scene: Controls;
    group: Group;

    // players
    playersCard?: Group;
    otherPlayers: OtherPlayer[] = [];
    currentPlayer: Player;
    onlineMap: Record<PlayerId, boolean> = {};
    playerTime: Record<PlayerId, number> = {};

    // status
    statusCard?: Group;
    statusText: string;
    buttons: ButtonData[] = [];

    // messages
    messagesCard?: Group;
    messages: Message[] = [];

    sidebarBackground?: Rectangle;

    readonly sizes = {
        padding: 10,
        fontSize: 15,
        strokeWidth: SIZES.STROKE_WIDTH,
        cornerRadius: SIZES.CORNER_RADIUS,
        statusWidth: 400
    };

    constructor(scene: Controls) {
        this.scene = scene;
        this.group = new Group();
        this.scene.add(this.group);
    }

    clearStatus() {
        this.statusText = "";
        this.redraw();
    }

    setStatus(status: string) {
        this.statusText = status;
        this.redraw();
    }

    setMessages(messages: Message[]) {
        this.messages = messages;
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
        // Clear old shapes
        this.group.destroyChildren();

        const sceneWidth = this.scene.width();
        const sceneHeight = this.scene.height();
        const adaptor = new TopBarDefaultAdaptor();

        const sidebarX = sceneWidth - this.sizes.statusWidth;
        const sidebarY = 0;
        const sidebarW = this.sizes.statusWidth;
        const sidebarH = sceneHeight;

        const offscreenOffset = 10;
        this.sidebarBackground = new Rectangle({
            x: sidebarX,
            y: sidebarY - offscreenOffset,
            width: sidebarW + offscreenOffset,
            height: sidebarH + offscreenOffset * 2,
            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: this.sizes.strokeWidth
        });
        this.group.add(this.sidebarBackground);

        let currentY = 0;

        // Players
        this.playersCard = adaptor.drawPlayers(this);
        this.playersCard.setPosition({
            x: sidebarX,
            y: currentY
        });
        this.group.add(this.playersCard);

        currentY = this.playersCard.getClientRect().bottom + this.sizes.padding;

        // Separator after players
        this.group.add(new Rectangle({
            x: sidebarX,
            y: currentY,
            width: sidebarW,
            height: 1,
            fill: Color.fromHex('#3D76BE').toString()
        }));

        // Status
        this.statusCard = adaptor.drawStatus(this);
        if (this.statusCard) {
            this.statusCard.setPosition({
                x: sidebarX,
                y: currentY
            });
            this.group.add(this.statusCard);

            currentY = this.statusCard.getClientRect().bottom + this.sizes.padding;

            // Separator after status
            this.group.add(new Rectangle({
                x: sidebarX,
                y: currentY,
                width: sidebarW,
                height: 1,
                fill: Color.fromHex('#3D76BE').toString()
            }));
        }

        // Messages
        this.messagesCard = this.drawMessagesBoard();
        this.messagesCard.setPosition({
            x: sidebarX,
            y: currentY
        });
        this.group.add(this.messagesCard);
    }

    togglePlayerCharacteristics() { /* no-op */
    }

    updateTime(playerTime: Record<PlayerId, number>) {
        this.playerTime = playerTime;

        for (const playerId in playerTime) {
            const playerDataLine = this.playersCard.findOne(playerId) as PlayerDataLine;
            playerDataLine?.time(this.playerTime[playerId]);
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

    setButtonDisabled(name: string, isDisabled: boolean) {
        (this.statusCard.findOne(`button.${name}`) as Button).disabled(isDisabled);
    }

    setAllButtonsDisabled(isDisabled: boolean) {
        for (const button of this.buttons) {
            this.setButtonDisabled(button.name, isDisabled);
        }
    }

    getMessageShape(message: Message, maxWidth: number): Group {
        const group = new Group({width: maxWidth});

        const textShape = new Text({
            x: 0,
            y: 0,
            text: message.text,
            fontFamily: "Exo2Regular",
            fontSize: 14,
            fill: "white",
            width: maxWidth
        });
        group.add(textShape);

        const rawActions = (message as any).actions ?? ((message as any).action ? [{
            text: (message as any).action,
            onClick: (message as any).onAction
        }] : []);
        let currentY = textShape.getClientRect().bottom + 6;

        for (let action of rawActions) {
            const actionText = new Text({
                x: 0,
                y: currentY,
                text: action.text,
                fontFamily: "Exo2Regular",
                fontSize: 12,
                fill: "rgba(200,200,200,1)",
            });
            const underline = new Rectangle({
                x: 0,
                y: actionText.getClientRect().bottom,
                width: Math.min(actionText.getClientRect().width, maxWidth),
                height: 1,
                fill: "rgba(200,200,200,1)"
            });
            if (typeof action.onClick === 'function') {
                actionText.on('click', action.onClick);
                underline.on('click', action.onClick);
            }
            group.add(actionText, underline);
            currentY = underline.getClientRect().bottom + 6;
        }

        return group;
    }

    getButtonsGroup(width: number): Group {
        let group = new Group({width: width});
        if (!this.buttons) {
            return group;
        }

        let buttonWidth = width / this.buttons.length;
        let buttonHeight = 40;

        for (let [index, button] of this.buttons.entries()) {
            let buttonShape = new Button({
                x: index * buttonWidth,
                y: 0,
                width: buttonWidth,
                height: buttonHeight,
                text: button.text,
                fill: button.color.DEFAULT.toString(),
                hoverFill: button.color.HOVER.toString(),
                activeFill: button.color.ACTIVE.toString(),
                disabledFill: button.color.DISABLED.toString(),
                name: button.name ? `button.${button.name}` : `button.${index}`
            }).on('click', button.onClick);
            group.add(buttonShape);
        }
        return group;
    }

    private drawMessagesBoard(): Group {
        const result = new Group();
        let currentY = this.sizes.padding;

        for (const message of this.messages) {
            const messageGroup = this.getMessageShape(message, this.sizes.statusWidth - 2 * this.sizes.padding);

            messageGroup.setPosition({
                x: this.sizes.padding,
                y: currentY
            });
            result.add(messageGroup);

            currentY = messageGroup.getClientRect().bottom + this.sizes.padding;
        }

        return result;
    }
}
