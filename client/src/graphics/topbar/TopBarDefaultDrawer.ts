import TopBarDrawer from "./TopBarDrawer";
import Vector2 from "../../../../common/Vector2";
import {OtherPlayer} from "../../../../common/GameForPlayerDTO";
import Color from "../engine/types/Color";

export default class TopBarDefaultDrawer extends TopBarDrawer {
    drawStatus(): void {
        if (!this.status.text)
            return;

        let textShapeStartY: number = this.sizes.padding + this.statusStartY;

        if (this.status.context) {
            this.status.contextShape = this.scene.text(
                this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth / 2,
                textShapeStartY,
                this.status.context + ":"
            )
                .setFillStyle(Color.fromHex(this.status.contextColor))
                .setFontFamily('Exo2Bold')
                .setFontSize(15)
                .setFillStyle(Color.WHITE)
                .setOrigin(0.5, 0)
                .setDepth(5);

            textShapeStartY = this.status.contextShape.getBounds().bottom + this.sizes.padding
        }

        this.status.textShape = this.scene.text(
            this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth / 2,
            textShapeStartY,
            this.status.text
        )
            .setFontFamily('Exo2Bold')
            .setFontSize(15)
            .setFillStyle(Color.WHITE)
            .setOrigin(0.5, 0)
            .setDepth(5);

        this.drawButtons();

        let bottomY: number;

        if (this.buttonsShapes.length) {
            bottomY = this.buttonsShapes[this.buttonsShapes.length - 1].backgroundShape.getBounds().bottom;
        } else {
            bottomY = this.status.textShape.getBounds().bottom;
        }

        let statusHeight = bottomY - this.status.textShape.getBounds().top + 2 * this.sizes.padding;


        this.status.backgroundShape = this.scene.rect(
            this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth, this.statusStartY,
            this.sizes.statusWidth, statusHeight
        )
            .setFillStyle(Color.fromHex('#0B2545', 0.75))
            .setStrokeStyle(Color.fromHex('#3D76BE'), this.sizes.strokeWidth)
            .setCornerRadius(this.sizes.cornerRadius);
    }

    drawCurrentPlayerData() {
        if (!this.currentPlayer)
            return;

        this.currentPlayerData = this.getPlayerStatusStringShape(this.currentPlayer.getOtherPlayer(), false)
            .setPosition(
                this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth + this.sizes.padding,
                this.sizes.margin + this.sizes.padding
            )
            .setDepth(5);

        this.currentPlayerData.events.on('pointerdown', () => {
            this.togglePlayerCharacteristics();
        });

        let height = 2 * this.sizes.padding + this.currentPlayerData.getBounds().height;

        this.playersDataBackground = this.scene.rect(
            this.sizes.sceneWidth - this.sizes.margin - this.sizes.statusWidth, this.sizes.margin,
            this.sizes.statusWidth, height
        )

            .setFillStyle(Color.fromHex('#0B2545', 0.75))
            .setStrokeStyle(Color.fromHex('#3D76BE'), this.sizes.strokeWidth)
            .setCornerRadius(this.sizes.cornerRadius);

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
                .setPosition(textStart.x, textStart.y + lineOffset * index)
                .setDepth(5);

            playersDataLine.events.on('pointerdown', () => {
                this.scene.gameManager.spaceshipsScene.panToPlayerWithId(player.id);
            });

            this.playersDataText.push(playersDataLine);
        }

        this.playersDataCloseText = this.scene.text(
            textStart.x, this.playersDataText[this.playersDataText.length - 1].getBounds().bottom + lineOffset,
            "Закрыть"
        )
            .setFontFamily('Exo2Bold')
            .setFontSize(15)
            .setFillStyle(Color.WHITE)
            .setOrigin(0, 1)
            .setDepth(5);
        this.playersDataCloseText.events.on('pointerdown', () => {
            this.togglePlayerCharacteristics();
        });

        let bb = this.playersDataCloseText.getBounds();
        this.scene.rect(bb.left, bb.top, bb.width, bb.height).setFillStyle(Color.YELLOW).setDepth(1000);


        let totalTextHeight = this.playersDataCloseText.getBounds().bottom - this.playersDataText[0].getBounds().top;

        let backgroundHeight = this.sizes.padding * 2 + totalTextHeight;
        let borderRadius = 10;

        this.playersDataBackground = this.scene.rect(
            textStart.x - this.sizes.padding, this.sizes.margin,
            this.sizes.statusWidth, backgroundHeight
        )
            .setFillStyle(Color.fromHex('#0B2545', 0.75))
            .setStrokeStyle(Color.fromHex('#3D76BE'), this.sizes.strokeWidth)
            .setCornerRadius(borderRadius);

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
