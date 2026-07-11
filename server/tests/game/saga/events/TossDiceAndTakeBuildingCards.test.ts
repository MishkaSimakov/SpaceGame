import {expect, test} from "vitest";

import {EventType} from "@common/Types";
import {showCardsToPlayersResponse, throwDiceResult} from "@common/Actions";

import {performEvent} from "@src/game/sagas/components/PerformEvent";
import {runSaga} from "@src/game/sagas/runner/RunSaga";
import {StateGetters} from "@common/getters/State";

import {attachReducers, fakeGameState, TestBus} from "../../Utils";


test('basicTest', async () => {
    const diceResult = 1;
    const cardsCount = 1;
    const sequence: string[] = [];

    const state = fakeGameState(2);
    const bus = new TestBus(state);

    attachReducers(bus, state);

    const event = state.stack.event.find(c => c.type === EventType.TossDiceAndTakeBuildingCards)!;
    state.stack.event = state.stack.event.filter(c => c !== event);

    bus.on('throwDice', () => {
        sequence.push('throwDice');

        bus.put(throwDiceResult(diceResult));
    });

    bus.on('showCardsToPlayersRequest', ({payload}) => {
        sequence.push('showCards');

        expect(payload.player).toEqual(StateGetters.currentPlayer(state).id);
        expect(payload.cards.length).toEqual(cardsCount);

        bus.put(showCardsToPlayersResponse());
    });

    await runSaga(bus.env, performEvent, event);

    expect(sequence).toEqual(['throwDice', 'showCards']);

    const currentPlayer = StateGetters.currentPlayer(state);
    expect(currentPlayer.hand.length).toEqual(cardsCount);
});