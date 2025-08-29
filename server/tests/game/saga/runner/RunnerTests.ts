import {test} from "uvu";
import * as assert from "uvu/assert";

import {setCurrentPlayer, throwDice, throwDiceResult} from "@common/Actions";

import {all, put, SagaGenerator, select, take} from "../../../../src/game/sagas/runner/Effects";
import ActionsBus from "../../../../src/game/ActionsBus";
import {fakeGameState} from "../../Utils";
import {runSaga} from "../../../../src/game/sagas/runner/RunSaga";

test('select', async () => {
    const state = fakeGameState(2);
    state.currentPlayerId = 42;

    const bus = new ActionsBus();

    function* testSaga(): SagaGenerator {
        const state = yield* select();

        assert.equal(state.currentPlayerId, 42);
    }

    await runSaga({state, bus}, testSaga);
});

test('put', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();

    function* testSaga(): SagaGenerator {
        yield* put(throwDiceResult(3));
    }

    let receivedAction = false;
    bus.on('throwDiceResult', (action) => {
        assert.equal(action.payload.result, 3);
        receivedAction = true;
    })

    await runSaga({state, bus}, testSaga);

    assert.ok(receivedAction);
});

test('putAndTake', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();

    function* testSaga(): SagaGenerator {
        const {req, res} = yield* all({
            req: put(throwDice(0)),
            res: take('throwDiceResult')
        });

        assert.equal(Object.keys(req).length, 0);
        assert.equal(res.payload.result, 5);
    }

    bus.on('throwDice', () => {
        bus.emit(throwDiceResult(5));
    });

    await runSaga({state, bus}, testSaga);
});

test('putAndPut', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();

    const actions = [];

    function* testSaga(): SagaGenerator {
        yield* all({
            first: put(throwDiceResult(1)),
            second: put(throwDiceResult(2))
        });

        actions.push("finished saga");
    }

    bus.on('throwDiceResult', ({payload}) => {
        if (payload.result === 1) {
            actions.push("first")
        } else if (payload.result === 2) {
            actions.push("second");
        } else {
            assert.unreachable("wrong payload");
        }
    });

    await runSaga({state, bus}, testSaga);

    assert.equal(actions, ["first", "second", "finished saga"])
});

// SagaRunner must have the following property:
// when yield* put(X); returns, all listeners of the event X must be executed.
test('putReturnsOnlyWhenListenersAreExecuted', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();
    let performedListener = false;

    function* testSaga(): SagaGenerator {
        yield* put(throwDice(state.players[0].id));

        assert.ok(performedListener);
    }

    bus.on('throwDice', () => {
        performedListener = true;
    });

    await runSaga({state, bus}, testSaga);

    assert.ok(performedListener);
});

test('multiStepSaga', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();

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

    await runSaga({state, bus}, testSaga);

    assert.ok(received);
});

test('exceptionTest', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();

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

    await runSaga({state, bus}, parent);
});

test('throwDuringPut', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();

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

    await runSaga({state, bus}, parent);
});

test('throwDuringAll', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();

    function* saga(): SagaGenerator {
        try {
            yield* all({
                req: put(throwDice(0)),
                res: take('throwDiceResult')
            });
        } catch (err) {
            assert.equal(err, 123);
            return;
        }

        assert.unreachable("exception should have been caught");
    }

    bus.on('throwDice', () => {
        throw 123;
    });

    await runSaga({state, bus}, saga);
});

test('throwInAllCancelsAllOtherEffects', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();

    function* saga(): SagaGenerator {
        try {
            yield* all({
                0: put(throwDice(0)),
                1: take('throwDiceResult'),
            });
        } catch (err) {
            bus.emit(throwDiceResult(123));
            return;
        }

        assert.unreachable("exception should have been caught");
    }

    bus.on('throwDice', (action) => {
        throw 123;
    });

    await runSaga({state, bus}, saga);
});

test('uncaughtException', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();

    function* saga(): SagaGenerator {
        throw 123;
    }

    try {
        await runSaga({state, bus}, saga);

        assert.unreachable("exception should have been thrown");
    } catch (err) {
        assert.equal(err, 123);
    }
});

test('returnValue', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();

    function* saga(): SagaGenerator {
        return 321;
    }

    const result = await runSaga({state, bus}, saga);

    assert.equal(result, 321);
});

test.run();