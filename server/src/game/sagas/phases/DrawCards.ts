import {put, select} from "../Effects";
import {
    changePlayerEnergy,
    chooseCardTypeRequest,
    chooseCardTypeResponse,
    drawAdditionalModuleCardRequest,
    drawAdditionalModuleCardResponse,
    drawAnotherEventCardRequest,
    drawAnotherEventCardResponse, pushCardsToDiscard,
    pushCardsToHand,
} from "@common/actions/Main";
import GameState from "../../GameState";
import {StateGetters} from "@common/getters/State";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {MainModuleType} from "@common/modules/MainModule";
import {request} from "../components/Request";
import {popOneCard} from "../components/PopCards";
import {showCards} from "../components/ShowCards";
import {Event} from "@common/events/Event";
import {performEvent} from "../components/PerformEvent";

export function* canDrawAnotherEventCard() {
    const state = yield* select();
    const player = StateGetters.currentPlayer(state);

    return SpaceshipGetters.getMainModuleType(player.spaceship) === MainModuleType.DrawAnotherEventCard
        && player.energy >= state.settings.energyToDragAnotherEventCardByMainModule;
}

export function canDrawAdditionalModuleCard(state: GameState) {
    const player = StateGetters.currentPlayer(state);

    return SpaceshipGetters.getMainModuleType(player.spaceship) === MainModuleType.DrawAdditionalModuleCard
        && player.energy >= state.settings.energyToDragAdditionalCardByMainModule;
}

export function* drawCards() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    const {chosenType} = yield* request(chooseCardTypeRequest(currentPlayer.id), chooseCardTypeResponse);

    if (chosenType === "module") {
        let drawAdditionalCard = false;

        do {
            const card = yield* popOneCard("module");
            yield* put(pushCardsToHand(currentPlayer, [card]));

            yield* showCards(currentPlayer, [card], true);

            if (canDrawAdditionalModuleCard(state)) {
                drawAdditionalCard = yield* request(
                    drawAdditionalModuleCardRequest(currentPlayer),
                    drawAdditionalModuleCardResponse
                );

                if (drawAdditionalCard) {
                    yield* put(changePlayerEnergy(
                        currentPlayer,
                        -state.settings.energyToDragAdditionalCardByMainModule,
                        "draw additional module card by main module"
                    ));
                }
            } else {
                drawAdditionalCard = false;
            }
        } while (drawAdditionalCard);
    } else {
        let drawAnotherCard = false;
        let card: Event;

        do {
            card = yield* popOneCard("event");

            yield* showCards(currentPlayer, [card], true);

            if (yield* canDrawAnotherEventCard()) {
                drawAnotherCard = yield* request(
                    drawAnotherEventCardRequest(currentPlayer.id),
                    drawAnotherEventCardResponse
                );

                if (drawAnotherCard) {
                    yield* put(changePlayerEnergy(
                        currentPlayer,
                        -state.settings.energyToDragAnotherEventCardByMainModule,
                        "draw another event card by main module"
                    ));

                    yield* put(pushCardsToDiscard("event", [card]));
                }
            } else {
                drawAnotherCard = false;
            }
        } while (drawAnotherCard);

        yield* performEvent(card);
    }
}
