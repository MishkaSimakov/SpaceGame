import {test} from "uvu";
import * as assert from "uvu/assert";

import {setCurrentPlayer, throwDice, throwDiceResult} from "@common/Actions";

import {put, SagaGenerator, select} from "../../../../src/game/sagas/runner/Effects";
import ActionsBus from "../../../../src/game/ActionsBus";
import {fakeGameState} from "../../Utils";
import {runSaga} from "../../../../src/game/sagas/runner/RunSaga";
import {GameInput} from "@src/game/sagas/runner/Environment";
import {Channel} from "@src/game/sagas/runner/Channel";

test('select', async () => {
    const state = fakeGameState(2);
    const input: GameInput = new Channel();
    state.currentPlayerId = 42;

    const bus = new ActionsBus();

    function* testSaga(): SagaGenerator {
        const state = yield* select();

        assert.equal(state.currentPlayerId, 42);
    }

    await runSaga({state, output: bus, input}, testSaga);
});

test('put', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    function* testSaga(): SagaGenerator {
        yield* put(throwDiceResult(3));
    }

    let receivedAction = false;
    bus.on('throwDiceResult', (action) => {
        assert.equal(action.payload.result, 3);
        receivedAction = true;
    })

    await runSaga({state, output: bus, input}, testSaga);

    assert.ok(receivedAction);
});


// SagaRunner must have the following property:
// when yield* put(X); returns, all listeners of the event X must be executed.
test('putReturnsOnlyWhenListenersAreExecuted', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();
    const input: GameInput = new Channel();
    let performedListener = false;

    function* testSaga(): SagaGenerator {
        yield* put(throwDice(state.players[0].id));

        assert.ok(performedListener);
    }

    bus.on('throwDice', () => {
        performedListener = true;
    });

    await runSaga({state, output: bus, input}, testSaga);

    assert.ok(performedListener);
});

test('multiStepSaga', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    function* testSaga(): SagaGenerator {
        yield* put(throwDice(21));

        const state = yield* select();
        assert.equal(state.currentPlayerId, 21);

        yield* put(setCurrentPlayer(123));
    }

    bus.on('throwDice', (action) => {
        state.currentPlayerId = action.payload.player;
    });

    let received = false;
    bus.on("setCurrentPlayer", () => {
        received = true;
    });

    await runSaga({state, output: bus, input}, testSaga);

    assert.ok(received);
});

test('exceptionTest', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    function* parent(): SagaGenerator {
        try {
            child();
        } catch (err) {
            assert.equal(err, 123);
        }
    }

    function* child() {
        throw 123;
    }

    await runSaga({state, output: bus, input}, parent);
});

test('throwDuringPut', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    function* parent(): SagaGenerator {
        try {
            yield* put(throwDice(0));
        } catch (err) {
            assert.equal(err, 123);
            return;
        }

        assert.unreachable("exception should have been caught");
    }

    bus.on('throwDice', () => {
        throw 123;
    });

    await runSaga({state, output: bus, input}, parent);
});

test('uncaughtException', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    function* saga(): SagaGenerator {
        throw 123;
    }

    try {
        await runSaga({state, output: bus, input}, saga);

        assert.unreachable("exception should have been thrown");
    } catch (err) {
        assert.equal(err, 123);
    }
});

test('returnValue', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    function* saga(): SagaGenerator {
        return 321;
    }

    const result = await runSaga({state, output: bus, input}, saga);

    assert.equal(result, 321);
});

test.run();