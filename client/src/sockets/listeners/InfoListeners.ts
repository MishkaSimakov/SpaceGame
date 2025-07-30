import {ListenersContainer} from "./ListenersContainer";
import {showCardsToPlayersResponse} from "@common/actions/Main";

export const infoListeners: ListenersContainer = {
    async showCardsToPlayersRequest({player, cards}, {game}) {
        const playerName = game.getPlayerById(player)?.name || player;

        await game.controlsScene.showCards(
            cards,
            player === game.currentPlayer.id ? "вы вытянули" : (playerName + " вытянул")
        );

        return showCardsToPlayersResponse();
    }

    // TODO: show without acknowledgment
}