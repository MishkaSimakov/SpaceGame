import {expect, test} from "vitest";

import {setCurrentPlayer, throwDice} from "@common/Actions";
import {Action} from "@common/ActionsHelpers";

import ActionsBus from "@src/game/ActionsBus";

test("simpleEmit", () => {
    const bus = new ActionsBus();

    let sequence: string[] = [];

    bus.on('throwDice', (action) => {
        expect(action.payload.player).toEqual(42);

        sequence.push("throwDice");
    });

    bus.emit(throwDice(42));

    expect(sequence).toEqual(["throwDice"]);
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

    expect(sequence).toEqual(["1", "2", "3"]);
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

    expect(sequence).toEqual(["throwDice", "setCurrentPlayer"]);
});

test("recursive", () => {
    const bus = new ActionsBus();

    let sequence: number[] = [];
    let counter = 0;

    bus.on('throwDice', (action) => {
        expect(action.payload.player).toEqual(counter);
        sequence.push(counter);

        ++counter;

        if (counter < 3) {
            bus.emit(throwDice(counter));
        }
    });

    bus.emit(throwDice(counter));

    expect(sequence).toEqual([0, 1, 2]);
});

test("promiseResolve", async () => {
    const bus = new ActionsBus();

    let executedListener = false;
    bus.on('throwDice', () => {
        executedListener = true;
    });

    await bus.emit(throwDice(0));

    expect(executedListener).toBeTruthy();
});

test("promiseReject", async () => {
    const bus = new ActionsBus();

    bus.on('throwDice', () => {
        throw 123;
    });

    try {
        await bus.emit(throwDice(0));

        expect.unreachable("promise must have been rejected");
    } catch (error) {
        expect(error).toEqual(123);
    }
});

test("middlewareChangeAction", () => {
    const bus = new ActionsBus();

    let receivedAction = false;

    bus.registerMiddleware({
        apply(action: Action<string, any, any>): Action<string, any, any> | undefined {
            expect(action.type).toEqual('throwDice');
            return setCurrentPlayer(123);
        }
    });

    bus.on('throwDice', () => {
        expect.unreachable("action must have been changed by middleware");
    });

    bus.on('setCurrentPlayer', () => {
        receivedAction = true;
    });

    bus.emit(throwDice(0));

    expect(receivedAction).toBeTruthy();
});

test("middlewareBlocksAction", () => {
    const bus = new ActionsBus();

    bus.registerMiddleware({
        apply(): Action<string, any, any> | undefined {
            return undefined;
        }
    });

    bus.on('throwDice', () => {
        expect.unreachable("action must have been blocked by middleware");
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
        expect.unreachable("exception must have been thrown");
    });

    try {
        await bus.emit(throwDice(0));
        expect.unreachable("exception must have been thrown");
    } catch (error) {
        expect(error).toEqual(123);
    }
});
