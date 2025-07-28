import {all, put, select, shuffle, take} from "../Effects";
import {
    changePlayerEnergy,
    chooseCardTypeRequest,
    chooseCardTypeResponse,
    drawAdditionalModuleCardRequest,
    drawAdditionalModuleCardResponse,
    drawAnotherEventCardRequest, drawAnotherEventCardResponse,
    playerDrawCardFromHeap,
    returnDiscardsToStack,
    showCardsToPlayersRequest,
    showCardsToPlayersResponse
} from "../actions/Main";
import GameState from "../GameState";
import Module from "@common/modules/Module";
import {Event} from "@common/events/Event";
import {StateGetters} from "@common/getters/State";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {MainModuleType} from "@common/modules/MainModule";
import {request} from "./Utils";

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

export function* drawOneCard(type: "module" | "event") {
    let state = yield* select();

    let discards = state.discards[type];

    if (state.stack[type].length === 0) {
        if (type === "module") {
            yield* shuffle(discards as Module[]);
        } else {
            yield* shuffle(discards as Event[]);
        }

        yield* put(returnDiscardsToStack(type, discards));

        // update state after reduce
        state = yield* select();
    }

    const topCard = state.stack[type].pop();
    yield* put(playerDrawCardFromHeap(StateGetters.currentPlayer(state).id, topCard));

    return topCard;
}

export function* drawCards() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    const {chosenType} = yield* request(chooseCardTypeRequest(currentPlayer.id), chooseCardTypeResponse);

    if (chosenType === "module") {
        let drawAdditionalCard = false;

        do {
            const card = yield* drawOneCard("module");

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
            const card = yield* drawOneCard("event");

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
