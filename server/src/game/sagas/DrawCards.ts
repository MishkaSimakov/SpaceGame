import Game from "../Game";
import {Event} from "../../../../common/events/Event";
import {MainModuleType} from "../../../../common/modules/MainModule";
import performEvent from "./old/EventsPerformManager";
import {all, put, select, take} from "../Effects";
import {
    chooseCardTypeRequest,
    chooseCardTypeResponse,
    playerAcknowledgedDrawnCard,
    playerDrawCardFromHeap
} from "../actions/Actions";

export function* drawCards() {
    const state = yield* select();
    const currentPlayer = state.players[state.currentPlayerIndex];

    const {req, res} = yield* all({
        req: put(chooseCardTypeRequest(currentPlayer.id)),
        res: take(chooseCardTypeResponse)
    });

    switch (res.payload.chosenType) {
        case 'event': {
            break;
        }
        case 'module': {
            // TODO: refill heap when it's empty
            const topCard = state.modulesStack[state.modulesStack.length - 1];

            yield* all({
                reduce: put(playerDrawCardFromHeap(currentPlayer.id, topCard)),
                waitAcknowledgment: take(playerAcknowledgedDrawnCard)
            });

            break;
        }
    }
    // if (res.payload.chosenType === 'event') {
    //     // let event: Event;
    //     // let drawAnother: boolean;
    //     //
    //     // do {
    //     //     drawAnother = false;
    //     //
    //     //     event = game.gameData.popEventCards()[0];
    //     //
    //     //     await game.showCardsToPlayer([event], game.currentPlayer, true);
    //     //
    //     //     console.log(`   Player get event card: ${event.description.replace("\n", " ")}`);
    //     //
    //     //     if (game.currentPlayer.spaceship.getMainModuleType() === MainModuleType.DrawAnotherEventCard
    //     //         && game.currentPlayer.energy >= game.ENERGY_TO_DRAG_ANOTHER_EVENT_CARD_BY_MAIN_MODULE) {
    //     //         const drawAnotherEventCard: boolean = await game.emitToCurrentPlayerAndWaitAcknowledgment('drawAnotherEventCard');
    //     //         if (drawAnotherEventCard) {
    //     //             game.currentPlayer.energy -= game.ENERGY_TO_DRAG_ANOTHER_EVENT_CARD_BY_MAIN_MODULE;
    //     //
    //     //             game.gameData.discardCards([event]);
    //     //             drawAnother = true;
    //     //
    //     //             console.log(`   Player draw another event card`);
    //     //         }
    //     //     }
    //     // } while (drawAnother);
    //     //
    //     // console.log(`   Performing event`);
    //     //
    //     // await performEvent(event, game);
    //     //
    //     // console.log(`   Event performed`);
    // } else if (cardType === 'module') {

    // }

    // game.changePlayerData(game.currentPlayer);
}
