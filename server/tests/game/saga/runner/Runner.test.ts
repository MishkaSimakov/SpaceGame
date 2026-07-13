import {expect, test} from "vitest";

import {setCurrentPlayer, throwDice, throwDiceResult} from "@common/Actions";

import {put, SagaGenerator, select} from "@src/game/sagas/runner/Effects";
import {runSaga} from "@src/game/sagas/runner/RunSaga";

import {fakeGameState, TestBus} from "../../Utils";

test('select', async () => {
    const state = fakeGameState(2);
    state.currentPlayerId = 42;

    const bus = new TestBus(state);

    function* testSaga(): SagaGenerator {
        const state = yield* select();

        expect(state.currentPlayerId).toEqual(42);
    }

    await runSaga(bus.env, testSaga);
});

test('put', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    function* testSaga(): SagaGenerator {
        yield* put(throwDiceResult(3));
    }

    let receivedAction = false;
    bus.on('throwDiceResult', (action) => {
        expect(action.payload.result).toEqual(3);
        receivedAction = true;
    });

    await runSaga(bus.env, testSaga);

    expect(receivedAction).toBeTruthy();
});


// SagaRunner must have the following property:
// when yield* put(X); returns, all listeners of the event X must be executed.
test('putReturnsOnlyWhenListenersAreExecuted', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);
    let performedListener = false;

    function* testSaga(): SagaGenerator {
        yield* put(throwDice(state.players[0].id));

        expect(performedListener).toBeTruthy();
    }

    bus.on('throwDice', () => {
        performedListener = true;
    });

    await runSaga(bus.env, testSaga);

    expect(performedListener).toBeTruthy();
});

test('multiStepSaga', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    function* testSaga(): SagaGenerator {
        yield* put(throwDice(21));

        const state = yield* select();
        expect(state.currentPlayerId).toEqual(21);

        yield* put(setCurrentPlayer(123));
    }

    bus.on('throwDice', (action) => {
        state.currentPlayerId = action.payload.player;
    });

    let received = false;
    bus.on("setCurrentPlayer", () => {
        received = true;
    });

    await runSaga(bus.env, testSaga);

    expect(received).toBeTruthy();
});

test('exceptionTest', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    // eslint-disable-next-line require-yield -- the saga under test raises before reaching an effect
    function* parent(): SagaGenerator {
        try {
            child();
        } catch (err) {
            expect(err).toEqual(123);
        }
    }

    // eslint-disable-next-line require-yield -- the saga under test raises before reaching an effect
    function* child() {
        throw 123;
    }

    await runSaga(bus.env, parent);
});

test('throwDuringPut', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    function* parent(): SagaGenerator {
        try {
            yield* put(throwDice(0));
        } catch (err) {
            expect(err).toEqual(123);
            return;
        }

        expect.unreachable("exception should have been caught");
    }

    bus.on('throwDice', () => {
        throw 123;
    });

    await runSaga(bus.env, parent);
});

test('uncaughtException', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    // eslint-disable-next-line require-yield -- the saga under test raises before reaching an effect
    function* saga(): SagaGenerator {
        throw 123;
    }

    try {
        await runSaga(bus.env, saga);

        expect.unreachable("exception should have been thrown");
    } catch (err) {
        expect(err).toEqual(123);
    }
});

test('returnValue', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    // eslint-disable-next-line require-yield -- the saga under test returns without emitting an effect
    function* saga(): SagaGenerator {
        return 321;
    }

    const result = await runSaga(bus.env, saga);

    expect(result).toEqual(321);
});
