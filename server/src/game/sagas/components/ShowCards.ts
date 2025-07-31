import Module from "@common/modules/Module";
import {Event} from "@common/events/Event";
import Player from "@common/Player";
import {request} from "./Request";
import {showCardsInfo, showCardsToPlayersRequest, showCardsToPlayersResponse} from "@common/actions/Main";
import {put, select} from "../../Effects";

export function* showCards(player: Player, cards: (Module | Event)[], showToOthers: boolean) {
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
        showCardsToPlayersResponse
    );
}