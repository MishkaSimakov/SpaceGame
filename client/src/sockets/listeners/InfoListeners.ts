import {ListenersContainer} from "./ListenersContainer";

import Actions from "@common/actions/Main";
import {PlayerId} from "@common/Player";
import Module from "@common/modules/Module";
import {Event} from "@common/events/Event";
import Game from "../../Game";

const {showCardsToPlayersResponse} = Actions;

async function showCards(player: PlayerId, cards: (Module | Event)[], game: Game) {
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
        await game.controlsScene.showLostScreen();
    }
}