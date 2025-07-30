import Module from "@common/modules/Module";
import {Event} from "@common/events/Event";
import Player from "@common/Player";
import {request} from "./Request";
import {showCardsToPlayersRequest, showCardsToPlayersResponse} from "@common/actions/Main";

export function* showCards(player: Player, cards: (Module | Event)[], showToOthers: boolean) {
    yield* request(
        showCardsToPlayersRequest(cards, player, showToOthers),
        showCardsToPlayersResponse
    );
}