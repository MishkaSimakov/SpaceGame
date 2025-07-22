import {test} from "uvu";
import * as assert from "uvu/assert";
import {all, put, SagaGenerator, select, take} from "../../../src/game/Effects";
import {SagaRunner} from "../../../src/game/SagaRunner";
import ActionsBus from "../../../src/game/actions/ActionsBus";
import {Action} from "../../../src/game/actions/Action";
import GameState from "../../../src/game/GameState";

test('select', async () => {
    const state = new GameState();
    state.currentPlayerIndex = 42;

    const bus = new ActionsBus();

    function* testSaga(): SagaGenerator {
        const state = yield* select();

        assert.equal(state.currentPlayerIndex, 42);
    }

    const runner = new SagaRunner(state, bus, testSaga());

    await runner.run();
});

test('put', async () => {
    const state = new GameState();
    const bus = new ActionsBus();

    const testAction = (value: number): Action => {
        return {type: 'testAction', payload: {value}};
    }

    function* testSaga(): SagaGenerator {
        yield* put(testAction(37));
    }

    let receivedAction = false;
    bus.on(testAction, (action) => {
        assert.equal(action.payload.value, 37);
        receivedAction = true;
    })

    const runner = new SagaRunner(state, bus, testSaga());
    await runner.run();

    assert.ok(receivedAction);
});

test('putAndTake', async () => {
    const state = new GameState();
    const bus = new ActionsBus();

    const testRequest = (): Action => {
        return {type: 'testRequest'};
    };

    const testResponse = (value: number): Action => {
        return {type: 'testResponse', payload: {value}};
    };

    function* testSaga(): SagaGenerator {
        const {req, res} = yield* all({
            req: put(testRequest()),
            res: take(testResponse)
        });

        assert.equal(Object.keys(req).length, 0);
        assert.equal(res.payload.value, 73);
    }

    bus.on(testRequest, () => {
        bus.emit(testResponse(73));
    });

    const runner = new SagaRunner(state, bus, testSaga());
    await runner.run();
});

test('putAndPut', async () => {
    const state = new GameState();
    const bus = new ActionsBus();

    const firstTestAction = (): Action => {
        return {type: 'firstTestAction'};
    };

    const secondTestAction = (): Action => {
        return {type: 'secondTestAction'};
    };

    function* testSaga(): SagaGenerator {
        yield* all({
            first: put(firstTestAction()),
            second: put(secondTestAction())
        });
    }

    let firstReceived = false;
    let secondReceived = false;

    bus.on(firstTestAction, () => {
        firstReceived = true;
    });

    bus.on(secondTestAction, () => {
        secondReceived = true;
    });

    const runner = new SagaRunner(state, bus, testSaga());
    await runner.run();

    assert.ok(firstReceived);
    assert.ok(secondReceived);
});

test('multiStepSaga', async () => {
    const state = new GameState();
    const bus = new ActionsBus();

    const setStateAction = (value: number): Action => {
        return {type: 'setStateAction', payload: {value}};
    };

    const testAction = (): Action => {
        return {type: 'testAction'};
    };

    function* testSaga(): SagaGenerator {
        yield* put(setStateAction(21));

        const state = yield* select();
        assert.equal(state.currentPlayerIndex, 21);

        yield* put(testAction());
    }

    bus.on(setStateAction, (action) => {
        state.currentPlayerIndex = action.payload.value;
    });

    let received = false;
    bus.on(testAction, () => {
        received = true;
    });

    const runner = new SagaRunner(state, bus, testSaga());
    await runner.run();

    assert.ok(received);
});


test.run();