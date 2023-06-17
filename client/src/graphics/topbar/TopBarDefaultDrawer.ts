import TopBarDrawer from "./TopBarDrawer";
import Vector2 from "../../../../common/Vector2";
import {OtherPlayer} from "../../../../common/GameForPlayerDTO";
import Color from "../Color";
import {Text} from "../engine/shapes/Text";
import {Rectangle} from "../engine/shapes/Rectangle";
import {PlayerDataLine} from "../shapes/PlayerDataLine";

export default class TopBarDefaultDrawer extends TopBarDrawer {
    drawStatus(): void {
        if (!this.status.text)
            return;

        let textShapeStartY: number = this.sizes.padding + this.statusStartY;

        if (this.status.context) {
            this.status.contextShape = new Text({
                x: this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth / 2,
                y: textShapeStartY,
                text: this.status.context + ":",
                fill: Color.fromHex(this.status.contextColor).toString(),
                fontFamily: "Exo2Bold",
                fontSize: 15,
                originX: 0.5
            });

            textShapeStartY = this.status.contextShape.getClientRect().bottom + this.sizes.padding
        }

        this.status.textShape = new Text({
            x: this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth / 2,
            y: textShapeStartY,
            text: this.status.text,
            fontFamily: "Exo2Bold",
            fontSize: 15,
            fill: "white",
            originX: 0.5
        });

        let buttons = this.getButtonsGroup(this.sizes.statusWidth - 2 * this.sizes.padding);
        this.buttonsGroup = buttons;

        buttons.originX(1).x(this.sizes.sceneWidth - this.sizes.margin - this.sizes.padding);

        if (this.status.textShape) {
            buttons.y(this.status.textShape.getClientRect().bottom + this.sizes.padding);
        } else {
            buttons.y(this.sizes.margin + this.sizes.margin);
        }

        let bottomY: number;

        if (this.buttons.length) {
            bottomY = buttons.getClientRect().bottom;
        } else {
            bottomY = this.status.textShape.getClientRect().bottom;
        }

        let statusHeight = bottomY - this.status.textShape.getClientRect().top + 2 * this.sizes.padding;

        this.status.backgroundShape = new Rectangle({
            x: this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth,
            y: this.statusStartY,
            width: this.sizes.statusWidth,
            height: statusHeight,
            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: this.sizes.strokeWidth,
            cornerRadius: this.sizes.cornerRadius
        });

        this.group.add(this.status.backgroundShape, this.status.contextShape, this.status.textShape, buttons);
    }

    drawCurrentPlayerData() {
        if (!this.currentPlayer)
            return;

        this.currentPlayerData = new PlayerDataLine({
            x: this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth + this.sizes.padding,
            y: this.sizes.margin + this.sizes.padding,

            player: this.currentPlayer.getOtherPlayer(),
            withName: false,
            withTimeControl: this.scene.gameManager.settings.withTimeControl,
            time: this.playerTime[this.currentPlayer.id],
        })
            .onClick(() => {
                this.togglePlayerCharacteristics();
            });

        let height = 2 * this.sizes.padding + this.currentPlayerData.getClientRect().height;

        this.playersDataBackground = new Rectangle({
            x: this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth,
            y: this.sizes.margin,
            width: this.sizes.statusWidth,
            height: height,
            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: this.sizes.strokeWidth,
            cornerRadius: this.sizes.cornerRadius
        })

        this.statusStartY = 2 * this.sizes.margin + height;

        this.group.add(this.playersDataBackground, this.currentPlayerData);
    }

    drawPlayersData() {
        let lineOffset = 25;

        let textStart = new Vector2(
            this.sizes.sceneWidth - this.sizes.statusWidth - this.sizes.margin + this.sizes.padding,
            this.sizes.margin + this.sizes.padding
        );

        let players: OtherPlayer[] = [];
        players.push(...this.otherPlayers);
        players.push(this.currentPlayer.getOtherPlayer());

        let topY = Infinity, bottomY = 0;

        for (let [index, player] of players.entries()) {
            let playersDataLine = new PlayerDataLine({
                x: textStart.x,
                y: textStart.y + lineOffset * index,

                player: player,
                withName: true,
                withTimeControl: this.scene.gameManager.settings.withTimeControl,
                time: this.playerTime[player.id],
            })
                .onClick(() => {
                    this.scene.gameManager.spaceshipsScene.panToPlayerWithId(player.id);
                });

            this.playersDataText.set(player.id, playersDataLine);

            let lineBB = playersDataLine.getClientRect();

            topY = Math.min(topY, lineBB.top);
            bottomY = Math.max(bottomY, lineBB.bottom);
        }

        this.playersDataCloseText = new Text({
            x: textStart.x,
            y: bottomY + lineOffset,
            text: "Закрыть",
            fontFamily: "Exo2Bold",
            fontSize: 15,
            fill: "white",
            originY: 1
        })
            .on('click', () => {
                this.togglePlayerCharacteristics();
            });

        let totalTextHeight = this.playersDataCloseText.getClientRect().bottom - topY;

        let backgroundHeight = this.sizes.padding * 2 + totalTextHeight;
        let borderRadius = 10;

        this.playersDataBackground = new Rectangle({
            x: textStart.x - this.sizes.padding,
            y: this.sizes.margin,
            width: this.sizes.statusWidth,
            height: backgroundHeight,
            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: this.sizes.strokeWidth,
            cornerRadius: borderRadius
        });

        this.statusStartY = backgroundHeight + 2 * this.sizes.margin;

        this.group.add(this.playersDataBackground, ...this.playersDataText.values(), this.playersDataCloseText);
    }

    drawMessages() {
        console.log(this.messages);
        const group = this.getMessagesGroup(this.sizes.statusWidth - 2 * this.sizes.padding, 5);
        const upperShape = this.status.text ? this.status.backgroundShape : this.playersDataBackground;
        const bottomY = upperShape.getClientRect().bottom + this.sizes.margin;

        group
            .y(bottomY)
            .originX(1)
            .x(this.sizes.sceneWidth - this.sizes.margin);

        this.group.add(group);
    }
}
