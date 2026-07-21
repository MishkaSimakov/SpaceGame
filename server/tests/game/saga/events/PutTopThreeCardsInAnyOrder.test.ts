import * as assert from "node:assert";

import {expect, test} from "vitest";

import {EventType} from "@common/Types";
import {permuteTopThreeEventCardsResponse} from "@common/Actions";

import {performEvent} from "@src/game/sagas/components/PerformEvent";
import {runSaga} from "@src/game/sagas/runner/RunSaga";

import {attachReducers, fakeGameState, TestBus} from "../../Utils";


test('basicTest', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    attachReducers(bus, state);

    const event = state.stack.event.find(c => c.type === EventType.PutTopThreeCardsInAnyOrder);
    assert.ok(event !== undefined);
    state.stack.event = state.stack.event.filter(c => c !== event);

    const topThreeCards = state.stack.event.slice(-3);

    bus.on('permuteTopThreeEventCardsRequest', (action) => {
        expect(action.payload.cards[0]).toEqual(topThreeCards[2]);
        expect(action.payload.cards[1]).toEqual(topThreeCards[1]);
        expect(action.payload.cards[2]).toEqual(topThreeCards[0]);

        bus.put(permuteTopThreeEventCardsResponse([2, 0, 1]));
    });

    await runSaga(bus.env, performEvent, event);

    const newTopThreeCards = state.stack.event.slice(-3);

    expect(newTopThreeCards[0]).toEqual(topThreeCards[1]);
    expect(newTopThreeCards[1]).toEqual(topThreeCards[2]);
    expect(newTopThreeCards[2]).toEqual(topThreeCards[0]);
});