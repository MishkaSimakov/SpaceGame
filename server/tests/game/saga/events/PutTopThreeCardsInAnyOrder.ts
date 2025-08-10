import {test} from "uvu";
import * as assert from "node:assert";

import {attachReducers, fakeGameState} from "../../Utils";
import ActionsBus from "../../../../src/game/ActionsBus";
import {SagaRunner} from "../../../../src/game/sagas/SagaRunner";
import {EventTypes} from "@common/events/Event";
import {performEvent} from "../../../../src/game/sagas/components/PerformEvent";
import Actions from "@common/actions/Main"


test('basicTest', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();

    attachReducers(bus, state);

    const event = state.stack.event.find(c => c.type === EventTypes.PutTopThreeCardsInAnyOrder);
    state.stack.event = state.stack.event.filter(c => c !== event);

    const topThreeCards = state.stack.event.slice(-3);
    console.log(topThreeCards.map(c => c.type));

    bus.on('permuteTopThreeEventCardsRequest', (action) => {
        assert.deepEqual(action.payload.cards[0], topThreeCards[2]);
        assert.deepEqual(action.payload.cards[1], topThreeCards[1]);
        assert.deepEqual(action.payload.cards[2], topThreeCards[0]);

        bus.emit(Actions.permuteTopThreeEventCardsResponse([2, 0, 1]));
    });

    const runner = new SagaRunner(state, bus, performEvent, event);
    await runner.run();

    const newTopThreeCards = state.stack.event.slice(-3);

    console.log(newTopThreeCards.map(c => c.type));

    assert.deepEqual(newTopThreeCards[0], topThreeCards[1]);
    assert.deepEqual(newTopThreeCards[1], topThreeCards[2]);
    assert.deepEqual(newTopThreeCards[2], topThreeCards[0]);
});

test.run();