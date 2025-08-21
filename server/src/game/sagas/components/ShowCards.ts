import ModuleCard from "@common/modules/ModuleCard";
import {EventCard} from "@common/events/EventCard";
import Player from "@common/Player";
import Actions from "@common/actions/Main";

import {request} from "./Request";
import {put, select} from "../Effects";

const {showCardsToPlayersRequest, showCardsInfo} = Actions;

export function* showCards(player: Player, cards: (ModuleCard | EventCard)[], showToOthers: boolean) {
    const state = yield* select();

    if (showToOthers) {
        for (const otherPlayer of state.players) {
            if (otherPlayer.id === player.id) {
                continue;
            }

            yield* put(showCardsInfo(otherPlayer, player, cards));
        }
    }

    yield* request(
        showCardsToPlayersRequest(player, player, cards),
        'showCardsToPlayersResponse'
    );
}