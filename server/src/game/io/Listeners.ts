import ActionsBus from "@common/actions/ActionsBus";
import SocketsManager from "./SocketsManager";
import {PlayerId} from "@common/Player";
import Module from "@common/modules/Module";
import {Event} from "@common/events/Event";
import Spaceship from "@common/Spaceship";
import {
    chooseCardTypeResponse, drawAdditionalModuleCardResponse, drawAnotherEventCardResponse,
    rebuildSpaceshipResponse, showCardsToPlayersResponse
} from "@common/actions/Main";
import * as Actions from "@common/actions/Main";

type IOListenersType = {
    [Key in keyof typeof Actions]?:
    typeof Actions[Key] extends (...args: any[]) => { type: string, payload?: infer P }
        ? (payload: P, services: { bus: ActionsBus, sockets: SocketsManager }) => void
        : never
};

// TODO: validation layer
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
    showCardsToPlayersRequest({cards, player, showToOthers}, {sockets, bus}) {
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
        sockets.emitAndWait(player, 'showCardsAndWait', true, player, cards)
            .then(() => {
                bus.emit(showCardsToPlayersResponse());
            });
    },
    chooseCardTypeRequest({player}, {sockets, bus}) {
        sockets.emitAndWait(player, 'chooseCardType', true)
            .then((cardType: string) => {
                bus.emit(chooseCardTypeResponse(cardType as ("module" | "event")));
            });
    },
    drawAdditionalModuleCardRequest({player}, {sockets, bus}) {
        sockets.emitAndWait(player, 'drawAdditionalModuleCard', true)
            .then((drawAdditional: boolean) => {
                bus.emit(drawAdditionalModuleCardResponse(drawAdditional));
            });
    },
    drawAnotherEventCardRequest({player}, {sockets, bus}) {
        sockets.emitAndWait(player, 'drawAnotherEventCard', true)
            .then((drawAnother: boolean) => {
                bus.emit(drawAnotherEventCardResponse(drawAnother));
            });
    }
};