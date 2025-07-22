import ActionsBus from "../actions/ActionsBus";
import SocketsManager from "./SocketsManager";
import {PlayerId} from "@common/Player";
import Module from "@common/modules/Module";
import {Event} from "@common/events/Event";
import Spaceship from "@common/Spaceship";
import {
    chooseCardTypeRequest,
    chooseCardTypeResponse,
    playerAcknowledgedDrawnCard,
    rebuildSpaceshipResponse
} from "../actions/Main";
import * as Actions from "../actions/Main";

type IOListenersType = {
    [Key in keyof typeof Actions]?:
    typeof Actions[Key] extends (...args: any[]) => { type: string, payload?: infer P }
        ? (payload: P, services: { bus: ActionsBus, sockets: SocketsManager }) => void
        : never
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
    rebuildSpaceshipRequest(payload, {bus, sockets}) {
        const playerId: PlayerId = payload.player;

        sockets.emitAndWait(playerId, 'rebuildSpaceship', true).then((response: {
            hand: (Module | Event)[],
            spaceship: Spaceship
        }) => {
            bus.emit(rebuildSpaceshipResponse(response.spaceship, response.hand));
        });
    },
    playerDrawCardFromHeap(payload, {sockets, bus}) {
        showCardsToPlayer(sockets, [payload.card], payload.player, true)
            .then(() => {
                bus.emit(playerAcknowledgedDrawnCard());
            });
    },
    chooseCardTypeRequest(payload, {sockets, bus}) {
        const playerId: PlayerId = payload.player;

        sockets.emitAndWait(playerId, 'chooseCardType', true).then((cardType: string) => {
            bus.emit(chooseCardTypeResponse(cardType));
        });
    }
};