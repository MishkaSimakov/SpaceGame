import TopBarDrawer from "./TopBarDrawer";
import Vector2 from "../../../../common/Vector2";
import {OtherPlayer} from "../../../../common/GameForPlayerDTO";
import Color from "../Color";
import {Button} from "../shapes/Button";
import {Text} from "../engine/shapes/Text";

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

        this.drawButtons();

        let bottomY: number;

        if (this.buttonsShapes.length) {
            bottomY = this.buttonsShapes[this.buttonsShapes.length - 1].getClientRect().bottom;
        } else {
            bottomY = this.status.textShape.getClientRect().bottom;
        }

        let statusHeight = bottomY - this.status.textShape.getClientRect().top + 2 * this.sizes.padding;

        this.status.backgroundShape = this.scene.createAndAdd.rectangle({
            x: this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth,
            y: this.statusStartY,
            width: this.sizes.statusWidth,
            height: statusHeight,
            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: this.sizes.strokeWidth,
            cornerRadius: this.sizes.cornerRadius
        });

        this.scene.add(this.status.contextShape, this.status.textShape, ...this.buttonsShapes);
    }

    drawCurrentPlayerData() {
        if (!this.currentPlayer)
            return;

        this.currentPlayerData = this.getPlayerStatusStringShape(this.currentPlayer.getOtherPlayer(), false)
            .setPosition({
                x: this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth + this.sizes.padding,
                y: this.sizes.margin + this.sizes.padding
            });

        this.currentPlayerData.on('pointerdown', () => {
            this.togglePlayerCharacteristics();
        });

        let height = 2 * this.sizes.padding + this.currentPlayerData.getClientRect().height;

        this.playersDataBackground = this.scene.createAndAdd.rectangle({
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

        this.scene.add(this.currentPlayerData);
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

        for (let [index, player] of players.entries()) {
            let playersDataLine = this.getPlayerStatusStringShape(player, true)
                .setPosition({
                    x: textStart.x,
                    y: textStart.y + lineOffset * index
                });

            playersDataLine.on('pointerdown', () => {
                this.scene.gameManager.spaceshipsScene.panToPlayerWithId(player.id);
            });

            this.playersDataText.push(playersDataLine);
        }

        this.playersDataCloseText = new Text({
            x: textStart.x,
            y: this.playersDataText[this.playersDataText.length - 1].getClientRect().bottom + lineOffset,
            text: "Закрыть",
            fontFamily: "Exo2Bold",
            fontSize: 15,
            fill: "white",
            originY: 1
        });

        this.playersDataCloseText.on('pointerdown', () => {
            this.togglePlayerCharacteristics();
        });

        let totalTextHeight = this.playersDataCloseText.getClientRect().bottom - this.playersDataText[0].getClientRect().top;

        let backgroundHeight = this.sizes.padding * 2 + totalTextHeight;
        let borderRadius = 10;

        this.playersDataBackground = this.scene.createAndAdd.rectangle({
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

        this.scene.add(...this.playersDataText, this.playersDataCloseText);
    }

    drawButtons() {
        if (!this.buttons)
            return;

        let totalWidth = this.sizes.statusWidth - 2 * this.sizes.padding;

        let buttonWidth = (totalWidth + this.sizes.padding) / this.buttons.length - this.sizes.padding;
        let buttonHeight = 40;
        let startY: number;

        if (this.status.textShape) {
            startY = this.status.textShape.getClientRect().bottom + this.sizes.padding;
        } else {
            startY = this.sizes.margin + this.sizes.margin;
        }

        let startX = this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth + this.sizes.padding;

        for (let [index, button] of this.buttons.entries()) {
            let buttonShape = new Button({
                x: startX + index * (buttonWidth + this.sizes.padding),
                y: startY,
                width: buttonWidth,
                height: buttonHeight,
                text: button.text,
                fill: button.color.DEFAULT.toString(),
                hoverFill:  button.color.HOVER.toString(),
                activeFill:  button.color.ACTIVE.toString()
            });

            this.buttonsShapes.push(buttonShape);
        }
    };

    drawMessages() {
    }
}
