import {test} from "uvu";
import * as assert from "uvu/assert";

import {EventType} from "@common/Types";
import {showCardsToPlayersResponse, throwDiceResult} from "@common/Actions";

import {attachReducers, fakeGameState} from "../../Utils";
import ActionsBus from "@src/game/ActionsBus";
import {performEvent} from "@src/game/sagas/components/PerformEvent";
import {runSaga} from "@src/game/sagas/runner/RunSaga";
import {StateGetters} from "@common/getters/State";
import {GameInput} from "@src/game/sagas/runner/Environment";
import {Channel} from "@src/game/sagas/runner/Channel";


test('basicTest', async () => {
    const diceResult = 1;
    const cardsCount = 1;
    const sequence: string[] = [];

    const state = fakeGameState(2);
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    attachReducers(bus, state);

    const event = state.stack.event.find(c => c.type === EventType.TossDiceAndTakeBuildingCards)!;
    state.stack.event = state.stack.event.filter(c => c !== event);

    bus.on('throwDice', () => {
        sequence.push('throwDice');

        input.put(throwDiceResult(diceResult));
    });

    bus.on('showCardsToPlayersRequest', ({payload}) => {
        sequence.push('showCards');

        assert.equal(payload.player, StateGetters.currentPlayer(state).id);
        assert.equal(payload.cards.length, cardsCount);

        input.put(showCardsToPlayersResponse());
    });

    await runSaga({state, output: bus, input}, performEvent, event);

    assert.equal(sequence, ['throwDice', 'showCards']);

    const currentPlayer = StateGetters.currentPlayer(state);
    assert.equal(currentPlayer.hand.length, cardsCount);
});

test.run();