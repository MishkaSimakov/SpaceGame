import TopBarDrawer from "./TopBarDrawer";
import {OtherPlayer} from "../../../../common/GameForPlayerDTO";
import {Text} from "../engine/shapes/Text";
import {Rectangle} from "../engine/shapes/Rectangle";
import Color from "../Color";
import {Button} from "../shapes/Button";
import {PlayerDataLine} from "../shapes/PlayerDataLine";

export default class TopBarSmallDrawer extends TopBarDrawer {
    drawStatus(): void {
        if (!this.status.text)
            return;

        this.status.textShape = new Text({
            x: this.sizes.sceneWidth / 2,
            y: this.statusStartY + this.sizes.padding,
            text: this.status.text,
            originX: 0.5,
            fontFamily: "Exo2Bold",
            fontSize: 15,
            fill: "white",
        });

        let buttons = this.getButtonsGroup(this.sizes.sceneWidth - 2 * this.sizes.padding);
        buttons.x(this.sizes.padding).y(this.status.textShape.getClientRect().bottom + this.sizes.padding);
        this.buttonsGroup = buttons;

        let bottomY: number;

        if (this.buttons.length) {
            bottomY = buttons.getClientRect().bottom;
        } else {
            bottomY = this.status.textShape.getClientRect().bottom;
        }

        let statusHeight = bottomY - this.status.textShape.getClientRect().top + 2 * this.sizes.padding;

        this.status.backgroundShape = new Rectangle({
            x: -this.sizes.strokeWidth,
            y: this.statusStartY,
            width: this.sizes.sceneWidth + this.sizes.strokeWidth * 2,
            height: statusHeight,
            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: this.sizes.strokeWidth,
        });

        this.messagesStartY = this.statusStartY + statusHeight;

        this.group.add(this.status.backgroundShape, this.status.textShape, buttons);
    }

    drawCurrentPlayerData() {
        if (!this.currentPlayer)
            return;

        this.currentPlayerData = new PlayerDataLine({
            x: this.sizes.padding,
            y: this.sizes.padding,
            width: this.sizes.sceneWidth - 2 * this.sizes.padding,

            player: this.currentPlayer.getOtherPlayer(),
            withName: false,
            withTimeControl: this.scene.gameManager.settings.withTimeControl,
            time: this.playerTime[this.currentPlayer.id],
        })
            .onClick(() => {
                this.togglePlayerCharacteristics();
            })

        let height = 2 * this.sizes.padding + this.currentPlayerData.getClientRect().height;

        this.playersDataBackground = new Rectangle({
            x: 0,
            y: 0,
            width: this.sizes.sceneWidth,
            height: height,
            fill: Color.fromHex('#0B2545', 0.75).toString()
        });

        // TODO: add line
        // if (this.status.text) {
        //     this.playersDataBackground.lineStyle(this.sizes.strokeWidth / 2, 0x3D76BE, 0.5);
        //     this.playersDataBackground.lineBetween(this.sizes.padding, height, this.sizes.sceneWidth - this.sizes.padding, height)
        //         .setDepth(4);
        // } else {
        //     this.playersDataBackground.lineBetween(0, height, this.sizes.sceneWidth, height)
        //         .setDepth(4);
        // }

        this.statusStartY = height;
        this.messagesStartY = height;

        this.group.add(this.playersDataBackground, this.currentPlayerData);
    }

    drawPlayersData() {
        let lineOffset = 25;

        let players: OtherPlayer[] = [];
        players.push(...this.otherPlayers);
        players.push(this.currentPlayer.getOtherPlayer());

        let topY = Infinity;
        let bottomY = 0;

        for (let [index, player] of players.entries()) {
            let playersDataLine = new PlayerDataLine({
                x: this.sizes.padding,
                y: this.sizes.padding + lineOffset * index,
                width: this.sizes.sceneWidth - 2 * this.sizes.padding,

                player: player,
                withName: true,
                withTimeControl: this.scene.gameManager.settings.withTimeControl,
                time: this.playerTime[player.id],
            })
                .onClick(() => {
                    this.scene.gameManager.spaceshipsScene.panToPlayerWithId(player.id);
                });

            this.playersDataText.set(player.id, playersDataLine);

            let textBB = playersDataLine.getClientRect();
            topY = Math.min(topY, textBB.top);
            bottomY = Math.max(bottomY, textBB.bottom);
        }

        this.playersDataCloseText = new Text({
            x: this.sizes.padding,
            y: bottomY + lineOffset,
            text: "Закрыть",
            originY: 1,
            fontFamily: "Exo2Bold",
            fontSize: 15,
            fill: "white"
        })
            .on('click', () => {
                this.togglePlayerCharacteristics();
            });

        let totalTextHeight = this.playersDataCloseText.getClientRect().bottom - topY;

        let backgroundHeight = this.sizes.padding * 2 + totalTextHeight;

        this.playersDataBackground = new Rectangle({
            x: 0,
            y: 0,
            width: this.sizes.sceneWidth,
            height: backgroundHeight,
            fill: Color.fromHex('#0B2545', 0.75).toString(),
        });

        // TODO: add line and uncomment
        //
        // this.playersDataBackground.fillStyle(0x0B2545, 0.75);
        // this.playersDataBackground.lineStyle(this.sizes.strokeWidth, 0x3D76BE);
        //
        // this.playersDataBackground.fillRect(0, 0, this.sizes.sceneWidth, backgroundHeight);

        // if (this.status.text) {
        //     this.playersDataBackground.lineStyle(this.sizes.strokeWidth / 2, 0x3D76BE, 0.5);
        //     this.playersDataBackground.lineBetween(this.sizes.padding, backgroundHeight, this.sizes.sceneWidth - this.sizes.padding, backgroundHeight)
        //         .setDepth(4);
        // } else {
        //     this.playersDataBackground.lineBetween(0, backgroundHeight, this.sizes.sceneWidth, backgroundHeight)
        //         .setDepth(4);
        // }

        this.statusStartY = backgroundHeight;
        this.messagesStartY = backgroundHeight;

        this.group.add(this.playersDataBackground, this.playersDataCloseText, ...this.playersDataText.values());
    }

    drawMessages() {
    }
}
