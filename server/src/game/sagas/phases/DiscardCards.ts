import {StateGetters} from "@common/getters/State";
import Actions from "@common/actions/Main";

import {put, select} from "../Effects";
import {request} from "../components/Request";

export function* discardCards() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    if (currentPlayer.hand.length <= state.settings.maxCardsOnHand) {
        return;
    }

    const discardedCardsIndexes = yield* request(
        Actions.discardCardsRequest(currentPlayer),
        'discardCardsResponse'
    );

    yield* put(Actions.disposeCardsFromPlayerHand(currentPlayer, discardedCardsIndexes, "discard cards phase"));
}
