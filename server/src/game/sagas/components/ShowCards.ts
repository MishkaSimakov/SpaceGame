import {Card, Player} from "@common/Types";
import {showCardsInfo, showCardsToPlayersRequest} from "@common/Actions";

import {request} from "./Request";
import {put, select} from "../Effects";

export function* showCards(player: Player, cards: Card[], showToOthers: boolean) {
    const state = yield* select();

    if (showToOthers) {
        for (const otherPlayer of state.players) {
            if (otherPlayer.id === player.id) {
                continue;
            }

            yield* put(showCardsInfo(otherPlayer.id, player.id, cards));
        }
    }

    yield* request(
        showCardsToPlayersRequest(player.id, player.id, cards),
        'showCardsToPlayersResponse'
    );
}