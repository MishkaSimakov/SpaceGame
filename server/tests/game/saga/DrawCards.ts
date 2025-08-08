import {test} from "uvu";
import ActionsBus from "../../../src/game/ActionsBus";
import {SagaRunner} from "../../../src/game/sagas/SagaRunner";
import {attachFakeRandomizer, attachReducers, fakeGameState} from "../Utils";
import * as assert from "node:assert";
import {popOneCard} from "../../../src/game/sagas/components/PopCards";

test('drawOneCard', async () => {
    for (const type of ["module", "event"]) {
        const state = fakeGameState(2);
        const bus = new ActionsBus();

        attachReducers(bus, state);

        const modulesCount = state.stack[type].length;
        const expectedCard = state.stack[type][modulesCount - 1];

        const {diceCalls, shuffleCalls} = attachFakeRandomizer(bus);
        const runner = new SagaRunner(state, bus, popOneCard, type as ("module" | "event"));
        const actualCard = await runner.run();

        assert.deepEqual(actualCard, expectedCard);

        assert.equal(state.stack[type].length, modulesCount - 1);

        assert.equal(diceCalls.value, 0);
        assert.equal(shuffleCalls.value, 0);
    }
});

test('drawOneCardWithDiscards', async () => {
    for (const type of ["module", "event"]) {
        const state = fakeGameState(2);
        const bus = new ActionsBus();

        state.discards.event = state.stack.event;
        state.discards.module = state.stack.module;
        state.stack.event = [];
        state.stack.module = [];

        attachReducers(bus, state);

        const modulesCount = state.discards[type].length;
        const expectedCard = state.discards[type][modulesCount - 1];

        const {diceCalls, shuffleCalls} = attachFakeRandomizer(bus);

        const runner = new SagaRunner(state, bus, popOneCard, type as ("module" | "event"));
        const actualCard = await runner.run();

        assert.deepEqual(actualCard, expectedCard);

        assert.equal(state.stack[type].length, modulesCount - 1);

        assert.equal(diceCalls.value, 0);
        assert.equal(shuffleCalls.value, 1);
    }
});

test.run();