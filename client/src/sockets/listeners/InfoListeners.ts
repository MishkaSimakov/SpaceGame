import {ListenersContainer} from "./ListenersContainer";

import Actions from "@common/actions/Main";
import {PlayerId} from "@common/Player";
import ModuleCard from "@common/modules/ModuleCard";
import {EventCard} from "@common/events/EventCard";
import Game from "../../Game";
import {ShowHugeMessageActivity} from "../../graphics/activities/ShowHugeMessage";

const {showCardsToPlayersResponse} = Actions;

async function showCards(player: PlayerId, cards: (ModuleCard | EventCard)[], game: Game) {
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

    async sendPlayerLostInfo({}, {game}) {
        await game.controlsScene.enqueueActivity(
            new ShowHugeMessageActivity(this, "Вы проиграли :(")
        );
    },
}