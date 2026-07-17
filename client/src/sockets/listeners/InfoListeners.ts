import {Card, PlayerId} from "@common/Types";
import {showCardsToPlayersResponse} from "@common/Actions";

import {ListenersContainer} from "./ListenersContainer";
import Game from "../../Game";
import {ShowHugeMessageActivity} from "../../graphics/activities/ShowHugeMessage";

async function showCards(player: PlayerId, cards: Card[], game: Game) {
    const playerName = game.getPlayerById(player)?.name || player;

    await game.controlsScene.showCards(
        cards,
        player === game.currentPlayer.id ? "вы вытянули" : (playerName + " вытянул")
    );
}

export const infoListeners: ListenersContainer = {
    async showCardsToPlayersRequest({cardsReceiver, cards}, {game}) {
        await showCards(cardsReceiver, cards, game);
        return showCardsToPlayersResponse();
    },

    async showCardsInfo({cardsReceiver, cards}, {game}) {
        await showCards(cardsReceiver, cards, game);
    },

    async sendPlayerLostInfo(_payload, {game}) {
        await game.controlsScene.enqueueActivity(
            new ShowHugeMessageActivity(this, "Вы проиграли :(")
        );
    },
};