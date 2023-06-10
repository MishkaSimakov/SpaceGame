import TopBarDrawer from "./TopBarDrawer";
import Vector2 from "../../../../common/Vector2";
import {OtherPlayer} from "../../../../common/GameForPlayerDTO";
import Button from "../Button";

export default class TopBarDefaultDrawer extends TopBarDrawer {
    drawStatus(): void {
        if (!this.status.text)
            return;

        let textShapeStartY: number = this.sizes.padding + this.statusStartY;

        if (this.status.context) {
            this.status.contextShape = this.scene.add.text(
                this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth / 2,
                textShapeStartY,
                this.status.context + ":"
            )
                .setStyle(this.textStyle)
                .setColor(this.status.contextColor)
                .setOrigin(0.5, 0)
                .setDepth(5)

            textShapeStartY = this.status.contextShape.getBounds().bottom + this.sizes.padding
        }

        this.status.textShape = this.scene.add.text(
            this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth / 2,
            textShapeStartY,
            this.status.text
        )
            .setStyle(this.textStyle)
            .setOrigin(0.5, 0)
            .setDepth(5);

        this.drawButtons();

        let bottomY: number;

        if (this.buttonsShapes.length) {
            bottomY = this.buttonsShapes[this.buttonsShapes.length - 1].background.getBounds().bottom;
        } else {
            bottomY = this.status.textShape.getBounds().bottom;
        }

        let statusHeight = bottomY - this.status.textShape.getBounds().top + 2 * this.sizes.padding;

        this.status.backgroundShape = this.scene.add.graphics();

        this.status.backgroundShape.fillStyle(0x0B2545, 0.75);
        this.status.backgroundShape.lineStyle(this.sizes.strokeWidth, 0x3D76BE);

        this.status.backgroundShape.fillRoundedRect(
            this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth, this.statusStartY,
            this.sizes.statusWidth, statusHeight, this.sizes.cornerRadius
        );
        this.status.backgroundShape.strokeRoundedRect(
            this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth - this.sizes.strokeWidth / 2, this.statusStartY - this.sizes.strokeWidth / 2,
            this.sizes.statusWidth + this.sizes.strokeWidth, statusHeight + this.sizes.strokeWidth,
            this.sizes.cornerRadius
        );
    }

    drawCurrentPlayerData() {
        if (!this.currentPlayer)
            return;

        this.currentPlayerData = this.getPlayerStatusStringShape(this.currentPlayer.getOtherPlayer(), false)
            .setPosition(
                this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth + this.sizes.padding,
                this.sizes.margin + this.sizes.padding
            )
            .on('pointerdown', () => {
                this.togglePlayerCharacteristics();
            })
            .setDepth(5);

        this.playersDataBackground = this.scene.add.graphics();

        this.playersDataBackground.fillStyle(0x0B2545, 0.75);
        this.playersDataBackground.lineStyle(this.sizes.strokeWidth, 0x3D76BE);

        let height = 2 * this.sizes.padding + this.currentPlayerData.getBounds().height;

        this.playersDataBackground.fillRoundedRect(
            this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth, this.sizes.margin,
            this.sizes.statusWidth, height, this.sizes.cornerRadius
        );
        this.playersDataBackground.strokeRoundedRect(
            this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth - this.sizes.strokeWidth / 2, this.sizes.margin - this.sizes.strokeWidth / 2,
            this.sizes.statusWidth + this.sizes.strokeWidth, height + this.sizes.strokeWidth,
            this.sizes.cornerRadius
        );

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
            this.playersDataText.push(
                this.getPlayerStatusStringShape(player, true)
                    .setPosition(textStart.x, textStart.y + lineOffset * index)
                    .setDepth(5)
                    .on('pointerdown', () => {
                        this.scene.gameManager.spaceshipsScene.panToPlayerWithId(player.id);
                    })
            );
        }

        this.playersDataCloseText = this.scene.add.text(textStart.x, this.playersDataText[this.playersDataText.length - 1].getBounds().bottom + lineOffset, "Закрыть")
            .setStyle(this.textStyle)
            .setOrigin(0, 1)
            .setDepth(5)
            .setInteractive()
            .on('pointerdown', () => {
                this.togglePlayerCharacteristics();
            });

        let totalTextHeight = this.playersDataCloseText.getBounds().bottom - this.playersDataText[0].getBounds().top;

        this.playersDataBackground = this.scene.add.graphics();
        let backgroundHeight = this.sizes.padding * 2 + totalTextHeight;
        let borderRadius = 10;

        this.playersDataBackground.fillStyle(0x0B2545, 0.75);
        this.playersDataBackground.lineStyle(this.sizes.strokeWidth, 0x3D76BE);

        this.playersDataBackground.fillRoundedRect(
            textStart.x - this.sizes.padding, this.sizes.margin, this.sizes.statusWidth, backgroundHeight, borderRadius
        );
        this.playersDataBackground.strokeRoundedRect(
            textStart.x - this.sizes.padding - this.sizes.strokeWidth / 2, this.sizes.margin - this.sizes.strokeWidth / 2,
            this.sizes.statusWidth + this.sizes.strokeWidth, backgroundHeight + this.sizes.strokeWidth,
            borderRadius
        );

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
            startY = this.status.textShape.getBounds().bottom + this.sizes.padding;
        } else {
            startY = this.sizes.margin + this.sizes.margin;
        }

        let startX = this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth + this.sizes.padding;

        for (let [index, button] of this.buttons.entries()) {
            let buttonShape = new Button(
                this.scene, button.onClick,
                startX + index * (buttonWidth + this.sizes.padding) + buttonWidth / 2,
                startY + buttonHeight / 2,
                buttonWidth, buttonHeight,
                button.text, this.sizes.cornerRadius, button.color,
                this.textStyle
            );

            buttonShape.background.setDepth(5);
            buttonShape.text.setDepth(5);

            this.buttonsShapes.push(buttonShape);
        }
    };

    drawMessages() {
    }
}
