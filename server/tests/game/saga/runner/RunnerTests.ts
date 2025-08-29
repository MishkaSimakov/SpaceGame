import {test} from "uvu";
import * as assert from "uvu/assert";

import {throwDice, throwDiceResult} from "@common/Actions";

import {all, call, put, SagaGenerator, select, take} from "../../../../src/game/sagas/runner/Effects";
import ActionsBus from "../../../../src/game/ActionsBus";
import {fakeGameState} from "../../Utils";
import {runSaga} from "../../../../src/game/sagas/runner/RunSaga";
import {TASK_CANCEL} from "../../../../src/game/sagas/runner/Task";

test('select', async () => {
    const state = fakeGameState(2);
    state.currentPlayerId = 42;

    const bus = new ActionsBus();

    function* testSaga(): SagaGenerator {
        const state = yield* select();

        assert.equal(state.currentPlayerId, 42);
    }

    const task = runSaga({state, bus}, testSaga);
    task.continue();
    await task.promise;
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

    const task = runSaga({state, bus}, testSaga);
    task.continue();
    await task.promise;

    assert.ok(receivedAction);
});

// test('putAndTake', async () => {
//     const state = fakeGameState(2);
//     const bus = new ActionsBus();
//
//     function* testSaga(): SagaGenerator {
//         const {req, res} = yield* all({
//             req: put(throwDice(state.players[0].id)),
//             res: take('throwDiceResult')
//         });
//
//         assert.equal(Object.keys(req).length, 0);
//         assert.equal(res.payload.result, 5);
//     }
//
//     bus.on('throwDice', () => {
//         bus.emit(throwDiceResult(5));
//     });
//
//     const task = runSaga({state, bus}, testSaga);
//     task.continue();
//     await task.promise;
// });

// test('putAndPut', async () => {
//     const state = fakeGameState(2);
//     const bus = new ActionsBus();
//
//     function* testSaga(): SagaGenerator {
//         yield* all({
//             first: put(throwDiceResult(1)),
//             second: put(throwDiceResult(2))
//         });
//     }
//
//     let firstReceived = false;
//     let secondReceived = false;
//
//     bus.on('throwDiceResult', ({payload}) => {
//         if (payload.result === 1) {
//             firstReceived = true;
//         } else if (payload.result === 2) {
//             secondReceived = true;
//         } else {
//             assert.unreachable("wrong payload");
//         }
//     });
//
//     await runSaga({state, bus}, testSaga).asPromise();
//
//     assert.ok(firstReceived);
//     assert.ok(secondReceived);
// });

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

    const task = runSaga({state, bus}, testSaga);
    task.continue();
    await task.promise;

    assert.ok(performedListener);
});

// test('multiStepSaga', async () => {
//     const state = fakeGameState(2);
//     const bus = new ActionsBus();
//
//     function* testSaga(): SagaGenerator {
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
//     const task = runSaga({state, bus}, testSaga);
//     task.continue();
//     await task.promise;
//
//     assert.ok(received);
// });

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

    const task = runSaga({state, bus}, parent);
    task.continue();
    await task.promise;
});

//
// test('cancelledTaskWithAllEffectAwaiting', async () => {
//     const state = fakeGameState(2);
//     const bus = new ActionsBus();
//
//     let continuedExecution = false;
//
//     function* parentSaga() {
//         const result = yield* call(childSaga);
//
//         assert.equal(result, "cancel");
//         continuedExecution = true;
//     }
//
//     function* childSaga() {
//         yield* all({
//             req: put(throwDice(state.players[0].id)),
//             res: take("throwDiceResult")
//         });
//
//         assert.unreachable("childSaga should have been cancelled");
//     }
//
//     bus.on('throwDice', () => {
//         task.cancel();
//     });
//
//     const task = runSaga({state, bus}, parentSaga);
//     const result = await task.asPromise();
//
//     assert.ok(continuedExecution);
//     assert.equal(result, TASK_CANCEL);
// });


test.run();