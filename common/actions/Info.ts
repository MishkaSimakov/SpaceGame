import Player, {PlayerId} from "../Player";
import Module from "../modules/Module";
import {Event} from "../events/Event";
import {action} from "./ActionConstructors";

export default {
    ...action('showCardsInfo', (player: Player, cardsReceiver: Player, cards: (Module | Event)[]) => {
        return {payload: {player: player.id, cardsReceiver: cardsReceiver.id, cards}}
    }),
    ...action('sendPlayerLostInfo', (playerId: PlayerId) => {
        return {payload: {player: playerId}};
    })
};