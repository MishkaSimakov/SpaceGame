import {StateGetters} from "@common/getters/State";
import {put, select} from "../../Effects";
import {request} from "../components/Request";
import {discardCardsRequest, discardCardsResponse, disposeCardsFromPlayerHand} from "@common/actions/Main";

export function* discardCards() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    if (currentPlayer.hand.length <= state.settings.maxCardsOnHand) {
        return;
    }

    const discardedCardsIndexes = yield* request(
        discardCardsRequest(currentPlayer),
        discardCardsResponse
    );

    if (currentPlayer.hand.length - discardedCardsIndexes.length > state.settings.maxCardsOnHand) {
        throw Error("player discarded not enough cards");
    }

    yield* put(disposeCardsFromPlayerHand(currentPlayer, discardedCardsIndexes, "discard cards phase"));
}
