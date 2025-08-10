import {test} from "uvu";
import * as assert from "uvu/assert";

import Actions from "@common/actions/Main"

import {all, newTask, put, SagaGenerator, select, take} from "../../../src/game/sagas/Effects";
import {SagaRunner} from "../../../src/game/sagas/SagaRunner";
import ActionsBus from "../../../src/game/ActionsBus";
import GameState from "../../../src/game/GameState";

const {throwDice, throwDiceResult} = Actions;

test('select', async () => {
    const state = new GameState();
    state.currentPlayerIndex = 42;

    const bus = new ActionsBus();

    function* testSaga(): SagaGenerator<void> {
        const state = yield* select();

        assert.equal(state.currentPlayerIndex, 42);
    }

    const runner = new SagaRunner(state, bus, testSaga);

    await runner.run();
});

test('put', async () => {
    const state = new GameState();
    const bus = new ActionsBus();

    function* testSaga(): SagaGenerator<void> {
        yield* put(throwDiceResult(3));
    }

    let receivedAction = false;
    bus.on('throwDiceResult', (action) => {
        assert.equal(action.payload, 3);
        receivedAction = true;
    })

    const runner = new SagaRunner(state, bus, testSaga);
    await runner.run();

    assert.ok(receivedAction);
});

test('putAndTake', async () => {
    const state = new GameState();
    const bus = new ActionsBus();

    function* testSaga(): SagaGenerator<void> {
        const {req, res} = yield* all({
            req: put(throwDice()),
            res: take('throwDiceResult')
        });

        assert.equal(Object.keys(req).length, 0);
        assert.equal(res.payload, 5);
    }

    bus.on('throwDice', () => {
        bus.emit(throwDiceResult(5));
    });

    const runner = new SagaRunner(state, bus, testSaga);
    await runner.run();
});

test('putAndPut', async () => {
    const state = new GameState();
    const bus = new ActionsBus();

    function* testSaga(): SagaGenerator<void> {
        yield* all({
            first: put(throwDiceResult(1)),
            second: put(throwDiceResult(2))
        });
    }

    let firstReceived = false;
    let secondReceived = false;

    bus.on('throwDiceResult', ({payload}) => {
        if (payload === 1) {
            firstReceived = true;
        } else if (payload === 2) {
            secondReceived = true;
        } else {
            assert.unreachable("wrong payload");
        }
    });

    const runner = new SagaRunner(state, bus, testSaga);
    await runner.run();

    assert.ok(firstReceived);
    assert.ok(secondReceived);
});

// test('multiStepSaga', async () => {
//     const state = new GameState();
//     const bus = new ActionsBus();
//
//     function* testSaga(): SagaGenerator<void> {
//         yield* put((21));
//
//         const state = yield* select();
//         assert.equal(state.currentPlayerIndex, 21);
//
//         yield* put(testAction());
//     }
//
//     bus.on(setStateAction, (action) => {
//         state.currentPlayerIndex = action.payload.value;
//     });
//
//     let received = false;
//     bus.on(testAction, () => {
//         received = true;
//     });
//
//     const runner = new SagaRunner(state, bus, testSaga);
//     await runner.run();
//
//     assert.ok(received);
// });

test('cancelledTask', async () => {
    const state = new GameState();
    const bus = new ActionsBus();

    let continuedExecution = false;

    function* parentSaga() {
        yield* newTask(childSaga);

        continuedExecution = true;
    }

    function* childSaga() {
        yield* put(throwDice());

        assert.unreachable("childSaga should have been cancelled");
    }

    const runner = new SagaRunner(state, bus, parentSaga);

    bus.on('throwDice', () => {
        runner.cancel("childSaga");
    });

    await runner.run();

    assert.ok(continuedExecution);
});

test('cancelledTaskWithAllEffectAwaiting', async () => {
    const state = new GameState();
    const bus = new ActionsBus();

    let continuedExecution = false;

    function* parentSaga() {
        yield* newTask(childSaga);

        continuedExecution = true;
    }

    function* childSaga() {
        yield* all({
            req: put(throwDice()),
            res: take("throwDiceResult")
        });

        assert.unreachable("childSaga should have been cancelled");
    }

    const runner = new SagaRunner(state, bus, parentSaga);

    bus.on('throwDice', () => {
        runner.cancel("childSaga");
    });

    await runner.run();

    assert.ok(continuedExecution);
});


test.run();