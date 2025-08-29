import {StateGetters} from "@common/getters/State";
import {discardCardsRequest, message, popCardsFromHand, pushCardsToDiscard} from "@common/Actions";

import {put, select} from "../runner/Effects";
import {request} from "../components/Request";

export function* discardCards() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    if (currentPlayer.hand.length <= state.settings.maxCardsOnHand) {
        return;
    }

    const {indexes} = yield* request(
        discardCardsRequest(currentPlayer.id),
        'discardCardsResponse'
    );

    const cards = currentPlayer.hand.filter((_, index) => indexes.includes(index));

    yield* put(popCardsFromHand(currentPlayer.id, indexes, "discard cards phase"));
    yield* put(pushCardsToDiscard(cards));

    yield* put(message(currentPlayer.id, `сбросил ${indexes.length} карт в конце хода`));
}
