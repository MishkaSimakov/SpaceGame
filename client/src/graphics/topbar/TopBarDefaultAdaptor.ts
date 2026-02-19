import {PlayerGetters} from "@common/getters/Player";
import {OtherPlayer} from "@common/Types";

import TopBarDrawer from "./TopBarDrawer";
import {Text} from "../engine/shapes/Text";
import {PlayerDataLine} from "../shapes/PlayerDataLine";
import {Group} from "../engine/Group";
import {TopBarAdaptor} from "./TopBarAdaptor";
import Color from "@common/helpers/Color";

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
                    online: drawer.onlineMap.find(v => v.player === player.id)?.online ?? false,
                    lost: player.lose,
                    isHisTurn: drawer.scene.gameManager.currentTurnPlayerId === player.id
                },
                withName: true,
                withTimeControl: drawer.scene.gameManager.settings.timeControlSettings !== undefined,
                time: drawer.playerTime[player.id] ?? 0,
            }).onClick(() => {
                drawer.scene.gameManager.panToPlayer(player.id);
            });

            playersDataLine.setAttr("name", String(player.id));
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
                fill: Color.WHITE.toString(),
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
