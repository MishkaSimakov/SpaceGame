import ActionsBus from "../actions/ActionsBus";
import SocketsManager from "./SocketsManager";
import {Action} from "../actions/Action";
import {PlayerId} from "../../../../common/Player";
import Module from "../../../../common/modules/Module";
import {Event} from "../../../../common/events/Event";
import Spaceship from "../../../../common/Spaceship";
import {
    chooseCardTypeRequest,
    chooseCardTypeResponse,
    playerAcknowledgedDrawnCard,
    rebuildSpaceshipResponse
} from "../actions/Actions";

type IOListenersType = {
    [key: string]: (action: Action, services: {
        bus: ActionsBus,
        sockets: SocketsManager
    }) => void
};

// TODO: move later somewhere...
async function showCardsToPlayer(sockets: SocketsManager, cards: (Module | Event)[], player: PlayerId, showToOther: boolean) {
    // if (showToOther) {
    //     for (let [otherPlayer, socket] of Object.entries(sockets.players)) {
    //         if (otherPlayer === player) {
    //             continue;
    //         }
    //
    //         sockets.getSocket(playerToEmit.id)?.emit('showCards', player, cards);
    //     }
    // }

    // TODO: show to others

    await sockets.emitAndWait(player, 'showCardsAndWait', true, player, cards);
}

export const IOListeners: IOListenersType = {
    rebuildSpaceshipRequest(action, {bus, sockets}) {
        const playerId: PlayerId = action.payload.player;

        sockets.emitAndWait(playerId, 'rebuildSpaceship', true).then((response: {
            hand: (Module | Event)[],
            spaceship: Spaceship
        }) => {
            bus.emit(rebuildSpaceshipResponse(response.spaceship, response.hand));
        });
    },
    playerDrawCardFromHeap(action, {sockets, bus}) {
        showCardsToPlayer(sockets, [action.payload.card], action.payload.player, true)
            .then(() => {
                bus.emit(playerAcknowledgedDrawnCard());
            });
    },
    chooseCardTypeRequest(action, {sockets, bus}) {
        const playerId: PlayerId = action.payload.player;

        sockets.emitAndWait(playerId, 'chooseCardType', true).then((cardType: string) => {
            bus.emit(chooseCardTypeResponse(cardType));
        });
    }
};