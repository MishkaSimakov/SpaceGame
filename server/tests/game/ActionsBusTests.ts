import {test} from "uvu";
import * as assert from "uvu/assert";

import {setCurrentPlayer, throwDice} from "@common/Actions";
import {Action} from "@common/ActionsHelpers";

import ActionsBus from "../../src/game/ActionsBus";

test("simpleEmit", () => {
    const bus = new ActionsBus();

    let sequence: string[] = [];

    bus.on('throwDice', (action) => {
        assert.equal(action.payload.player, 42);

        sequence.push("throwDice");
    });

    bus.emit(throwDice(42));

    assert.equal(sequence, ["throwDice"]);
});

test("manyListeners", () => {
    const bus = new ActionsBus();

    let sequence: string[] = [];

    bus.on('throwDice', () => {
        sequence.push("1");
    });

    bus.on('throwDice', () => {
        sequence.push("2");
    });

    bus.on('throwDice', () => {
        sequence.push("3");
    });

    bus.emit(throwDice(42));

    assert.equal(sequence, ["1", "2", "3"]);
});

test("nested", () => {
    const bus = new ActionsBus();

    let sequence: string[] = [];

    bus.on('throwDice', () => {
        sequence.push('throwDice');

        bus.emit(setCurrentPlayer(213));
    });

    bus.on('setCurrentPlayer', () => {
        sequence.push('setCurrentPlayer');
    })

    bus.emit(throwDice(42));

    assert.equal(sequence, ["throwDice", "setCurrentPlayer"]);
});

test("recursive", () => {
    const bus = new ActionsBus();

    let sequence: number[] = [];
    let counter = 0;

    bus.on('throwDice', (action) => {
        assert.equal(action.payload.player, counter);
        sequence.push(counter);

        ++counter;

        if (counter < 3) {
            bus.emit(throwDice(counter));
        }
    });

    bus.emit(throwDice(counter));

    assert.equal(sequence, [0, 1, 2]);
});

test("promiseResolve", async () => {
    const bus = new ActionsBus();

    let executedListener = false;
    bus.on('throwDice', () => {
        executedListener = true;
    });

    await bus.emit(throwDice(0));

    assert.ok(executedListener);
});

test("promiseReject", async () => {
    const bus = new ActionsBus();

    bus.on('throwDice', () => {
        throw 123;
    });

    try {
        await bus.emit(throwDice(0));

        assert.unreachable("promise must have been rejected");
    } catch (error) {
        assert.equal(error, 123);
    }
});

test("middlewareChangeAction", () => {
    const bus = new ActionsBus();

    let receivedAction = false;

    bus.registerMiddleware({
        apply(action: Action<string, any, any>): Action<string, any, any> | undefined {
            assert.equal(action.type, 'throwDice');
            return setCurrentPlayer(123);
        }
    });

    bus.on('throwDice', () => {
        assert.unreachable("action must have been changed by middleware");
    });

    bus.on('setCurrentPlayer', () => {
        receivedAction = true;
    });

    bus.emit(throwDice(0));

    assert.ok(receivedAction);
});

test("middlewareBlocksAction", () => {
    const bus = new ActionsBus();

    bus.registerMiddleware({
        apply(): Action<string, any, any> | undefined {
            return undefined;
        }
    });

    bus.on('throwDice', () => {
        assert.unreachable("action must have been blocked by middleware");
    });

    bus.emit(throwDice(0));
});

test("middlewareThrows", async () => {
    const bus = new ActionsBus();

    bus.registerMiddleware({
        apply(): Action<string, any, any> | undefined {
            throw 123;
        }
    });

    bus.on('throwDice', () => {
        assert.unreachable("exception must have been thrown");
    });

    try {
        await bus.emit(throwDice(0));
        assert.unreachable("exception must have been thrown");
    } catch (error) {
        assert.equal(error, 123);
    }
});