import TopBarDrawer from "./TopBarDrawer";
import Vector2 from "../../../../common/Vector2";
import {OtherPlayer} from "../../../../common/GameForPlayerDTO";
import Color from "../Color";

export default class TopBarDefaultDrawer extends TopBarDrawer {
    drawStatus(): void {
        if (!this.status.text)
            return;

        let textShapeStartY: number = this.sizes.padding + this.statusStartY;

        if (this.status.context) {
            this.status.contextShape = this.scene.createAndAdd.text({
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

        this.status.textShape = this.scene.createAndAdd.text({
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

        this.playersDataCloseText = this.scene.createAndAdd.text({
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

        let bb = this.playersDataCloseText.getClientRect();
        this.scene.createAndAdd.rectangle({
            x: bb.left,
            y: bb.top,
            width: bb.width,
            height: bb.height,
            fill: "yellow",
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

        // TODO: finish button and uncomment
        // for (let [index, button] of this.buttons.entries()) {
        //     let buttonShape = new Button(
        //         this.scene, button.onClick,
        //         startX + index * (buttonWidth + this.sizes.padding) + buttonWidth / 2,
        //         startY + buttonHeight / 2,
        //         buttonWidth, buttonHeight,
        //         button.text, this.sizes.cornerRadius, button.color,
        //         this.textStyle
        //     );
        //
        //     buttonShape.background.setDepth(5);
        //     buttonShape.text.setDepth(5);
        //
        //     this.buttonsShapes.push(buttonShape);
        // }
    };

    drawMessages() {
    }
}
