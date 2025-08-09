import Player, {PlayerId} from "../Player";
import Module from "../modules/Module";
import {Event} from "../events/Event";

export const showCardsInfo = (player: Player, cardsReceiver: Player, cards: (Module | Event)[]) => {
    return {
        type: 'showCardsInfo',
        payload: {player: player.id, cardsReceiver: cardsReceiver.id, cards}
    }
}

export const sendPlayerLostInfo = (playerId: PlayerId) => {
    return {
        type: 'sendPlayerLostInfo',
        payload: {player: playerId}
    };
}