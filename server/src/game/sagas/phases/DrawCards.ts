import {all, put, select, shuffle, take} from "../../Effects";
import {
    changePlayerEnergy,
    chooseCardTypeRequest,
    chooseCardTypeResponse,
    drawAdditionalModuleCardRequest,
    drawAdditionalModuleCardResponse,
    drawAnotherEventCardRequest, drawAnotherEventCardResponse,
    showCardsToPlayersRequest,
    showCardsToPlayersResponse
} from "../../actions/Main";
import GameState from "../../GameState";
import {StateGetters} from "@common/getters/State";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {MainModuleType} from "@common/modules/MainModule";
import {request} from "../components/Request";
import {popOneCard} from "../components/PopCards";

export function canDrawAnotherEventCard(state: GameState) {
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

            yield* request(
                showCardsToPlayersRequest([card], currentPlayer, true),
                showCardsToPlayersResponse
            );

            if (canDrawAdditionalModuleCard(state)) {
                drawAdditionalCard = yield* request(
                    drawAdditionalModuleCardRequest(currentPlayer.id),
                    drawAdditionalModuleCardResponse
                );

                if (drawAdditionalCard) {
                    yield* put(changePlayerEnergy(
                        currentPlayer,
                        -state.settings.energyToDragAdditionalCardByMainModule,
                        "draw additional module card by main module"
                    ));
                }
            }
        } while (drawAdditionalCard);
    } else {
        let drawAnotherCard = false;

        do {
            const card = yield* popOneCard("event");

            yield* request(
                showCardsToPlayersRequest([card], currentPlayer, true),
                showCardsToPlayersResponse
            );

            if (canDrawAnotherEventCard(state)) {
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
                }
            }
        } while (drawAnotherCard);
    }
}
