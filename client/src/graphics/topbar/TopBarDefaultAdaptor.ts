import {OtherPlayer} from "@common/GameForPlayerDTO";
import {PlayerGetters} from "@common/getters/Player";

import TopBarDrawer from "./TopBarDrawer";
import {Text} from "../engine/shapes/Text";
import {PlayerDataLine} from "../shapes/PlayerDataLine";
import {Group} from "../engine/Group";
import {TopBarAdaptor} from "./TopBarAdaptor";

export default class TopBarDefaultAdaptor extends TopBarAdaptor {
    drawPlayers(drawer: TopBarDrawer): Group {
        const result = new Group();

        let currentY = drawer.sizes.padding;

        const players: OtherPlayer[] = [];
        players.push(PlayerGetters.forOtherPlayer(drawer.currentPlayer));
        players.push(...drawer.otherPlayers);

        for (const player of players.values()) {
            const playersDataLine = new PlayerDataLine({
                x: drawer.sizes.padding,
                y: currentY,
                width: drawer.sizes.width - drawer.sizes.padding * 2,
                player: player,
                status: {
                    online: drawer.onlineMap[player.id],
                    lost: player.lose,
                    isHisTurn: drawer.scene.gameManager.currentTurnPlayerId === player.id
                },
                withName: true,
                withTimeControl: drawer.scene.gameManager.settings.withTimeControl,
                time: drawer.playerTime[player.id],
            }).onClick(() => {
                drawer.scene.gameManager.spaceshipsScene.panToPlayerWithId(player.id);
            });

            playersDataLine.setAttr("name", player.id);
            result.add(playersDataLine);

            currentY += playersDataLine.getClientRect().height + 5;
        }

        return result;
    }

    drawStatus(drawer: TopBarDrawer): Group | undefined {
        if (!drawer.statusText && drawer.buttons.length === 0) {
            return undefined;
        }

        const result = new Group();

        let currentY = drawer.sizes.padding;

        if (drawer.statusText) {
            const textShape = new Text({
                x: drawer.sizes.padding,
                y: currentY,
                text: drawer.statusText,
                fontFamily: "Exo2Bold",
                fontSize: 15,
                fill: "white",
                originX: 0
            });
            result.add(textShape);

            currentY += textShape.height() + drawer.sizes.padding;
        }

        if (drawer.buttons.length !== 0) {
            const buttons = drawer.getButtonsGroup(drawer.sizes.width - 2 * drawer.sizes.padding);
            buttons.setAttrs({
                originX: 0,
                x: drawer.sizes.padding,
                y: currentY
            });
            result.add(buttons);
        }

        return result;
    }
}
