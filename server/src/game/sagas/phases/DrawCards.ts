import {StateGetters} from "@common/getters/State";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {CardType, EventCard, MainModuleType} from "@common/Types";
import {
    changePlayerEnergy,
    chooseCardTypeRequest,
    drawAdditionalModuleCardRequest,
    drawAnotherEventCardRequest,
    message,
    pushCardsToDiscard,
    pushCardsToHand
} from "@common/Actions";

import {put, select} from "../runner/Effects";
import {request} from "../components/Request";
import {popOneCard} from "../components/PopCards";
import {showCards} from "../components/ShowCards";
import {performEvent} from "../components/PerformEvent";

export function* canDrawAnotherEventCard() {
    const state = yield* select();
    const player = StateGetters.currentPlayer(state);

    return SpaceshipGetters.getMainModuleType(player.spaceship) === MainModuleType.DrawAnotherEventCard
        && player.energy >= state.settings.energyToDragAnotherEventCardByMainModule;
}

export function* canDrawAdditionalModuleCard() {
    const state = yield* select();
    const player = StateGetters.currentPlayer(state);

    return SpaceshipGetters.getMainModuleType(player.spaceship) === MainModuleType.DrawAdditionalModuleCard
        && player.energy >= state.settings.energyToDragAdditionalCardByMainModule;
}

export function* drawCards() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    const {chosenType} = yield* request(
        chooseCardTypeRequest(currentPlayer.id),
        'chooseCardTypeResponse'
    );
    yield* put(message(currentPlayer.id, `тянет карточку ${chosenType === CardType.Module ? "строительства" : "действия"}`));

    if (chosenType === CardType.Module) {
        while (true) {
            const card = yield* popOneCard(CardType.Module);
            yield* put(pushCardsToHand(currentPlayer.id, [card]));

            yield* showCards(currentPlayer, [card], true);

            if (yield* canDrawAdditionalModuleCard()) {
                const response = yield* request(
                    drawAdditionalModuleCardRequest(currentPlayer.id),
                    'drawAdditionalModuleCardResponse'
                );

                if (response.draw) {
                    yield* put(changePlayerEnergy(
                        currentPlayer.id,
                        -state.settings.energyToDragAdditionalCardByMainModule,
                        "draw additional module card by main module"
                    ));

                    yield* put(message(currentPlayer.id, `использует командный модуль, чтобы взять дополнительную карточку строительства (-${state.settings.energyToDragAdditionalCardByMainModule}⚡)`));
                } else {
                    break;
                }
            } else {
                break;
            }
        }
    } else {
        let card: { cardType: "event", event: EventCard };

        while (true) {
            card = yield* popOneCard(CardType.Event);

            yield* showCards(currentPlayer, [card], true);

            if (yield* canDrawAnotherEventCard()) {
                const response = yield* request(
                    drawAnotherEventCardRequest(currentPlayer.id),
                    'drawAnotherEventCardResponse'
                );

                if (response.draw) {
                    yield* put(changePlayerEnergy(
                        currentPlayer.id,
                        -state.settings.energyToDragAnotherEventCardByMainModule,
                        "draw another event card by main module"
                    ));

                    yield* put(pushCardsToDiscard([card]));

                    yield* put(message(currentPlayer.id, `использует командный модуль, чтобы взять другую карточку действия (-${state.settings.energyToDragAnotherEventCardByMainModule}⚡)`));
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        yield* performEvent(card.event);
    }
}
