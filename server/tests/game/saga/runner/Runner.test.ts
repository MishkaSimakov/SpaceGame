import {expect, test} from "vitest";

import {setCurrentPlayer, throwDice, throwDiceResult} from "@common/Actions";

import {put, SagaGenerator, select, take} from "@src/game/sagas/runner/Effects";
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

test('abort', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    function* testSaga(): SagaGenerator {
        yield* select();

        yield* put(throwDice(123));

        expect.unreachable();
    }

    bus.on('throwDice', () => {
        bus.abortHandle.abort("hello");
    });

    await expect(() => runSaga(bus.env, testSaga)).rejects.toThrowError("hello");
});

// Resolves to how the saga run ended, or to "pending" if it has not ended at all.
// An aborted run must always end: a run that stays pending has leaked its saga.
function outcomeOf(run: Promise<any>): Promise<"resolved" | "rejected" | "pending"> {
    return Promise.race([
        run.then(() => "resolved" as const, () => "rejected" as const),
        new Promise<"pending">(resolve => setTimeout(() => resolve("pending"), 50))
    ]);
}

// A saga suspended in take is resumed by whoever puts on the input channel. Abort must not
// depend on that happening: when the game dies, nobody will ever answer the pending request.
test('abortWhileSagaIsSuspendedInTake', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    function* testSaga(): SagaGenerator {
        yield* put(throwDice(0));

        yield* take();

        expect.unreachable("saga must not be resumed after abort");
    }

    // the request is received, but left unanswered, so the saga suspends in take
    bus.on('throwDice', () => {});

    const run = runSaga(bus.env, testSaga);
    run.catch(() => {});

    bus.abortHandle.abort("hello");

    expect(await outcomeOf(run)).toEqual("rejected");
});

// An aborted saga is never resumed, so its finally blocks are its only chance to release
// whatever it holds.
test('abortFinalizesSaga', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    let finalized = false;

    function* testSaga(): SagaGenerator {
        try {
            yield* put(throwDice(0));

            expect.unreachable("saga must not be resumed after abort");
        } finally {
            finalized = true;
        }
    }

    bus.on('throwDice', () => {
        bus.abortHandle.abort("hello");
    });

    await expect(() => runSaga(bus.env, testSaga)).rejects.toThrowError("hello");

    expect(finalized).toBeTruthy();
});

// The first failure is the one that explains why the run died; anything raised afterwards is
// a consequence of it.
test('abortKeepsTheFirstError', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    function* testSaga(): SagaGenerator {
        yield* put(throwDice(0));

        expect.unreachable("saga must not be resumed after abort");
    }

    bus.on('throwDice', () => {
        bus.abortHandle.abort("first");
        bus.abortHandle.abort("second");
    });

    await expect(() => runSaga(bus.env, testSaga)).rejects.toThrowError("first");
});

// Input keeps arriving after an abort: a response to an already sent request, a cheat action.
// None of it may restart a saga that has been killed.
//
// An assertion inside an aborted saga cannot show this: the run has already settled, so whatever
// the saga raises is discarded. The saga must be observed from the outside.
test('sagaIsNotResumedByInputAfterAbort', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    let resumed = false;

    function* testSaga(): SagaGenerator {
        yield* put(throwDice(0));

        yield* take();

        resumed = true;
    }

    bus.on('throwDice', () => {});

    const run = runSaga(bus.env, testSaga);
    run.catch(() => {});

    bus.abortHandle.abort("hello");
    bus.put(throwDiceResult(3));

    expect(await outcomeOf(run)).toEqual("rejected");
    expect(resumed).toBeFalsy();
});

// Aborting finalizes the saga, which runs its cleanup code, which may itself fail. abort is called
// from inside a channel receiver, so a cleanup error that escapes it escapes the receiver too —
// and takes with it the consumer call that ends the run.
test('abortSurvivesAFailingCleanup', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    function* testSaga(): SagaGenerator {
        try {
            yield* put(throwDice(0));
        } finally {
            // eslint-disable-next-line no-unsafe-finally -- a saga whose cleanup fails is what this test is about
            throw new Error("cleanup failed");
        }
    }

    let escapedTheReceiver: unknown = undefined;

    bus.on('throwDice', () => {
        try {
            bus.abortHandle.abort("hello");
        } catch (error) {
            escapedTheReceiver = error;
        }
    });

    const run = runSaga(bus.env, testSaga);
    run.catch(() => {});

    expect(await outcomeOf(run)).toEqual("rejected");
    await expect(run).rejects.toThrowError("hello");

    expect(escapedTheReceiver).toBeUndefined();
});

// A saga aborted while it is suspended in put is resumed by the put it is suspended in: the
// receiver that aborted returns, and the channel then runs the callback that resumes the sender.
// Everything the saga would go on to do — reducers applied to state, actions appended to the log —
// happens after the run has already been declared dead, and must not happen at all.
test('sagaIsNotResumedByItsOwnPutAfterAbort', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

    let resumed = false;

    function* testSaga(): SagaGenerator {
        yield* put(throwDice(0));

        resumed = true;

        yield* put(setCurrentPlayer(123));
    }

    bus.on('throwDice', () => {
        bus.abortHandle.abort("hello");
    });

    let receivedLaterAction = false;
    bus.on('setCurrentPlayer', () => {
        receivedLaterAction = true;
    });

    await expect(() => runSaga(bus.env, testSaga)).rejects.toThrowError("hello");

    expect(resumed).toBeFalsy();
    expect(receivedLaterAction).toBeFalsy();
});