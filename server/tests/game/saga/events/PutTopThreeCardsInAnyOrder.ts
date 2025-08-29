import {test} from "uvu";
import * as assert from "uvu/assert";

import {EventType} from "@common/Types";
import {permuteTopThreeEventCardsResponse} from "@common/Actions";

import {attachReducers, fakeGameState} from "../../Utils";
import ActionsBus from "@src/game/ActionsBus";
import {performEvent} from "@src/game/sagas/components/PerformEvent";
import {runSaga} from "@src/game/sagas/runner/RunSaga";


test('basicTest', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();

    attachReducers(bus, state);

    const event = state.stack.event.find(c => c.type === EventType.PutTopThreeCardsInAnyOrder);
    state.stack.event = state.stack.event.filter(c => c !== event);

    const topThreeCards = state.stack.event.slice(-3);

    bus.on('permuteTopThreeEventCardsRequest', (action) => {
        assert.equal(action.payload.cards[0], topThreeCards[2]);
        assert.equal(action.payload.cards[1], topThreeCards[1]);
        assert.equal(action.payload.cards[2], topThreeCards[0]);

        bus.emit(permuteTopThreeEventCardsResponse([2, 0, 1]));
    });

    await runSaga({state, bus}, performEvent, event);

    const newTopThreeCards = state.stack.event.slice(-3);

    assert.equal(newTopThreeCards[0], topThreeCards[1]);
    assert.equal(newTopThreeCards[1], topThreeCards[2]);
    assert.equal(newTopThreeCards[2], topThreeCards[0]);
});

test.run();