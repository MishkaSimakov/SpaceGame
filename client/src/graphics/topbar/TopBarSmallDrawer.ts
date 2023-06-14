import TopBarDrawer from "./TopBarDrawer";
import {OtherPlayer} from "../../../../common/GameForPlayerDTO";

export default class TopBarSmallDrawer extends TopBarDrawer {
    drawStatus(): void {
        // if (!this.status.text)
        //     return;
        //
        // this.status.textShape = this.scene.text(
        //     this.sizes.sceneWidth / 2, this.statusStartY + this.sizes.padding,
        //     this.status.text
        // )
        //     // .setStyle(this.textStyle)
        //     .setOrigin(0.5, 0)
        //     .setDepth(5);
        //
        // this.drawButtons();
        //
        // let bottomY: number;
        //
        // if (this.buttonsShapes.length) {
        //     bottomY = this.buttonsShapes[this.buttonsShapes.length - 1].backgroundShape.getBounds().bottom;
        // } else {
        //     bottomY = this.status.textShape.getBounds().bottom;
        // }
        //
        // let statusHeight = bottomY - this.status.textShape.getBounds().top + 2 * this.sizes.padding;
        //
        // this.status.backgroundShape = this.scene.rect(0, this.statusStartY, this.sizes.sceneWidth, statusHeight)
        //     .setFillStyle(Color.fromHex('#0B2545', 0.75))
        //     .setStrokeStyle(Color.fromHex('#3D76BE'), this.sizes.strokeWidth);
        //
        // this.messagesStartY = this.statusStartY + statusHeight;
    }

    drawCurrentPlayerData() {
        // if (!this.currentPlayer)
        //     return;
        //
        // this.currentPlayerData = this.getPlayerStatusStringShape(this.currentPlayer.getOtherPlayer(), false)
        //     .setPosition(this.sizes.padding, this.sizes.padding)
        //     .setDepth(5);
        // this.currentPlayerData.events.on('pointerdown', () => {
        //     this.togglePlayerCharacteristics();
        // })
        //
        // // this.playersDataBackground.fillStyle(0x0B2545, 0.75);
        // // this.playersDataBackground.lineStyle(this.sizes.strokeWidth, 0x3D76BE);
        //
        // let height = 2 * this.sizes.padding + this.currentPlayerData.getBounds().height;
        //
        // this.playersDataBackground = this.scene.rect(0, 0, this.sizes.sceneWidth, height)
        //     .setFillStyle(Color.fromHex('#0B2545', 0.75));
        //
        // // TODO: add line and uncomment
        // // if (this.status.text) {
        // //     this.playersDataBackground.lineStyle(this.sizes.strokeWidth / 2, 0x3D76BE, 0.5);
        // //     this.playersDataBackground.lineBetween(this.sizes.padding, height, this.sizes.sceneWidth - this.sizes.padding, height)
        // //         .setDepth(4);
        // // } else {
        // //     this.playersDataBackground.lineBetween(0, height, this.sizes.sceneWidth, height)
        // //         .setDepth(4);
        // // }
        //
        // this.statusStartY = height;
        // this.messagesStartY = height;
    }

    drawPlayersData() {
        // let lineOffset = 25;
        //
        // let players: OtherPlayer[] = [];
        // players.push(...this.otherPlayers);
        // players.push(this.currentPlayer.getOtherPlayer());
        //
        // for (let [index, player] of players.entries()) {
        //     let playersDataLine = this.getPlayerStatusStringShape(player, true)
        //         .setPosition(this.sizes.padding, this.sizes.padding + lineOffset * index)
        //         .setDepth(5);
        //
        //     playersDataLine.events.on('pointerdown', () => {
        //         this.scene.gameManager.spaceshipsScene.panToPlayerWithId(player.id);
        //     });
        //
        //     this.playersDataText.push(playersDataLine);
        // }
        //
        // this.playersDataCloseText = this.scene.text(this.sizes.padding, this.playersDataText[this.playersDataText.length - 1].getBounds().bottom + lineOffset, "Закрыть")
        //     // .setStyle(this.textStyle)
        //     .setOrigin(0, 1)
        //     .setDepth(5)
        //
        // this.playersDataCloseText.events.on('pointerdown', () => {
        //     this.togglePlayerCharacteristics();
        // });
        //
        // let totalTextHeight = this.playersDataCloseText.getBounds().bottom - this.playersDataText[0].getBounds().top;
        //
        //
        // // TODO: add line and uncomment
        // // this.playersDataBackground = this.scene.add.graphics();
        // let backgroundHeight = this.sizes.padding * 2 + totalTextHeight;
        // //
        // // this.playersDataBackground.fillStyle(0x0B2545, 0.75);
        // // this.playersDataBackground.lineStyle(this.sizes.strokeWidth, 0x3D76BE);
        // //
        // // this.playersDataBackground.fillRect(0, 0, this.sizes.sceneWidth, backgroundHeight);
        //
        // // if (this.status.text) {
        // //     this.playersDataBackground.lineStyle(this.sizes.strokeWidth / 2, 0x3D76BE, 0.5);
        // //     this.playersDataBackground.lineBetween(this.sizes.padding, backgroundHeight, this.sizes.sceneWidth - this.sizes.padding, backgroundHeight)
        // //         .setDepth(4);
        // // } else {
        // //     this.playersDataBackground.lineBetween(0, backgroundHeight, this.sizes.sceneWidth, backgroundHeight)
        // //         .setDepth(4);
        // // }
        //
        // this.statusStartY = backgroundHeight;
        // this.messagesStartY = backgroundHeight;
    }

    drawButtons() {
        // if (!this.buttons)
        //     return;
        //
        // let totalWidth = this.sizes.sceneWidth - 2 * this.sizes.padding;
        // let buttonWidth = (totalWidth + this.sizes.padding) / this.buttons.length - this.sizes.padding;
        // let buttonHeight = 40;
        // let startY: number;
        //
        // if (this.status.textShape) {
        //     startY = this.status.textShape.getBounds().bottom + this.sizes.padding;
        // } else {
        //     startY = this.sizes.margin + this.sizes.margin;
        // }
        //
        // let startX = this.sizes.padding;
        //
        // for (let [index, button] of this.buttons.entries()) {
        //
        //     // TODO: finish button and uncomment
        //     // let buttonShape = new Button(
        //     //     this.scene, button.onClick,
        //     //     startX + index * (buttonWidth + this.sizes.padding) + buttonWidth / 2,
        //     //     startY + buttonHeight / 2,
        //     //     buttonWidth, buttonHeight,
        //     //     button.text, this.sizes.cornerRadius, button.color,
        //     //     this.textStyle
        //     // );
        //     //
        //     // buttonShape.background.setDepth(5);
        //     // buttonShape.text.setDepth(5);
        //     //
        //     // this.buttonsShapes.push(buttonShape);
        // }
    };

    drawMessages() {
        // if (this.messages.length === 0)
        //     return;
        //
        // let message = this.messages[this.messages.length - 1];
        //
        // if (message.id === this.hiddenMessageId)
        //     return;
        //
        // this.messagesShape.push(
        //     this.getMessageShape(message)
        //         .setPosition(this.sizes.padding * 2, this.messagesStartY + this.sizes.padding * 2)
        // );
    }
}
