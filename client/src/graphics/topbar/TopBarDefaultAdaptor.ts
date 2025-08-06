import {OtherPlayer} from "@common/GameForPlayerDTO";
import Vector2 from "@common/Vector2";
import {PlayerGetters} from "@common/getters/Player";

import TopBarDrawer from "./TopBarDrawer";
import {TopBarAdaptor} from "./TopBarAdaptor";
import Color from "../Color";
import {Text} from "../engine/shapes/Text";
import {Rectangle} from "../engine/shapes/Rectangle";
import {PlayerDataLine} from "../shapes/PlayerDataLine";
import {Shape} from "../engine/Shape";
import {Group} from "../engine/Group";

export default class TopBarDefaultAdaptor extends TopBarAdaptor {
    drawStatus(drawer: TopBarDrawer, sceneWidth: number): void {
        if (!drawer.status.text && drawer.buttons.length === 0)
            return;

        const shapes: (Shape | Group)[] = [];

        const startY = drawer.statusStartY;
        let currentY = drawer.sizes.padding + drawer.statusStartY;

        if (drawer.status.text) {
            drawer.status.textShape = new Text({
                x: sceneWidth - drawer.sizes.margin - drawer.sizes.statusWidth / 2,
                y: currentY,
                text: drawer.status.text,
                fontFamily: "Exo2Bold",
                fontSize: 15,
                fill: "white",
                originX: 0.5
            });

            shapes.push(drawer.status.textShape);

            currentY += drawer.status.textShape.height() + drawer.sizes.padding;
        }

        if (drawer.buttons.length !== 0) {
            const buttons = drawer.getButtonsGroup(drawer.sizes.statusWidth - 2 * drawer.sizes.padding);
            drawer.buttonsGroup = buttons;

            buttons.setAttrs({
                originX: 1,
                x: sceneWidth - drawer.sizes.margin - drawer.sizes.padding,
                y: currentY
            });

            currentY += buttons.height() + drawer.sizes.padding;

            shapes.push(buttons);
        }

        drawer.status.backgroundShape = new Rectangle({
            x: sceneWidth - drawer.sizes.margin - drawer.sizes.statusWidth,
            y: drawer.statusStartY,
            width: drawer.sizes.statusWidth,
            height: currentY - startY,
            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: drawer.sizes.strokeWidth,
            cornerRadius: drawer.sizes.cornerRadius
        });

        drawer.group.add(drawer.status.backgroundShape, ...shapes);
    }

    drawCurrentPlayerData(drawer: TopBarDrawer, sceneWidth: number) {
        if (!drawer.currentPlayer)
            return;

        drawer.currentPlayerData = new PlayerDataLine({
            x: sceneWidth - drawer.sizes.margin - drawer.sizes.statusWidth + drawer.sizes.padding,
            y: drawer.sizes.margin + drawer.sizes.padding,
            width: drawer.sizes.statusWidth - 2 * drawer.sizes.padding,

            player: PlayerGetters.forOtherPlayer(drawer.currentPlayer),
            online: drawer.onlineMap[drawer.currentPlayer.id],
            withName: false,
            withTimeControl: drawer.scene.gameManager.settings.withTimeControl,
            time: drawer.playerTime[drawer.currentPlayer.id],
        })
            .onClick(() => {
                drawer.togglePlayerCharacteristics();
            });

        let height = 2 * drawer.sizes.padding + drawer.currentPlayerData.getClientRect().height;

        drawer.playersDataBackground = new Rectangle({
            x: sceneWidth - drawer.sizes.margin - drawer.sizes.statusWidth,
            y: drawer.sizes.margin,
            width: drawer.sizes.statusWidth,
            height: height,
            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: drawer.sizes.strokeWidth,
            cornerRadius: drawer.sizes.cornerRadius
        })

        drawer.statusStartY = 2 * drawer.sizes.margin + height;

        drawer.group.add(drawer.playersDataBackground, drawer.currentPlayerData);
    }

    drawPlayersData(drawer: TopBarDrawer, sceneWidth: number) {
        let lineOffset = 25;

        let textStart = new Vector2(
            sceneWidth - drawer.sizes.statusWidth - drawer.sizes.margin + drawer.sizes.padding,
            drawer.sizes.margin + drawer.sizes.padding
        );

        let players: OtherPlayer[] = [];
        players.push(...drawer.otherPlayers);
        players.push(PlayerGetters.forOtherPlayer(drawer.currentPlayer));

        let topY = Infinity, bottomY = 0;

        for (let [index, player] of players.entries()) {
            let playersDataLine = new PlayerDataLine({
                x: textStart.x,
                y: textStart.y + lineOffset * index,
                width: drawer.sizes.statusWidth - 2 * drawer.sizes.padding,

                player: player,
                online: drawer.onlineMap[player.id],
                withName: true,
                withTimeControl: drawer.scene.gameManager.settings.withTimeControl,
                time: drawer.playerTime[player.id],
            })
                .onClick(() => {
                    drawer.scene.gameManager.spaceshipsScene.panToPlayerWithId(player.id);
                });

            drawer.playersDataText.set(player.id, playersDataLine);

            let lineBB = playersDataLine.getClientRect();

            topY = Math.min(topY, lineBB.top);
            bottomY = Math.max(bottomY, lineBB.bottom);
        }

        drawer.playersDataCloseText = new Text({
            x: textStart.x,
            y: bottomY + lineOffset,
            text: "Закрыть",
            fontFamily: "Exo2Bold",
            fontSize: 15,
            fill: "white",
            originY: 1
        })
            .on('click', () => {
                drawer.togglePlayerCharacteristics();
            });

        let totalTextHeight = drawer.playersDataCloseText.getClientRect().bottom - topY;

        let backgroundHeight = drawer.sizes.padding * 2 + totalTextHeight;
        let borderRadius = 10;

        drawer.playersDataBackground = new Rectangle({
            x: textStart.x - drawer.sizes.padding,
            y: drawer.sizes.margin,
            width: drawer.sizes.statusWidth,
            height: backgroundHeight,
            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: drawer.sizes.strokeWidth,
            cornerRadius: borderRadius
        });

        drawer.statusStartY = backgroundHeight + 2 * drawer.sizes.margin;

        drawer.group.add(drawer.playersDataBackground, ...drawer.playersDataText.values(), drawer.playersDataCloseText);
    }

    // drawMessages() {
    //     drawer.messagesGroup = drawer.getMessagesGroup(drawer.sizes.statusWidth - 2 * drawer.sizes.padding, 5);
    //     const upperShape = drawer.status.text ? drawer.status.backgroundShape : drawer.playersDataBackground;
    //     const bottomY = upperShape.getClientRect().bottom + drawer.sizes.margin;
    //
    //     drawer.messagesGroup
    //         .y(bottomY)
    //         .originX(1)
    //         .x(sceneWidth - drawer.sizes.margin);
    //
    //     drawer.group.add(drawer.messagesGroup);
    // }
}
