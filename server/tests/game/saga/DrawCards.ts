import {test} from "uvu";
import ActionsBus from "../../../src/game/actions/ActionsBus";
import {SagaRunner} from "../../../src/game/SagaRunner";
import {attachReducers, CountingRandomizer, fakeGameState} from "../Utils";
import {drawOneCard} from "../../../src/game/sagas/DrawCards";
import * as assert from "node:assert";


test('drawOneCard', async () => {
    for (const type of ["module", "event"]) {
        const state = fakeGameState(2);
        const bus = new ActionsBus();

        attachReducers(bus, state);

        const modulesCount = state.stack[type].length;
        const expectedCard = state.stack[type][modulesCount - 1];

        const randomizer = new CountingRandomizer();
        const runner = new SagaRunner(state, bus, randomizer, drawOneCard(type as ("module" | "event")));
        const actualCard = await runner.run();

        assert.deepEqual(actualCard, expectedCard);

        const hand = state.players[0].hand;
        assert.equal(hand.length, 1);
        assert.deepEqual(hand[0], expectedCard);

        assert.equal(state.stack[type].length, modulesCount - 1);

        assert.equal(randomizer.diceCalls, 0);
        assert.equal(randomizer.shuffleCalls, 0);
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

        const randomizer = new CountingRandomizer();
        const runner = new SagaRunner(state, bus, randomizer, drawOneCard(type as ("module" | "event")));
        const actualCard = await runner.run();

        assert.deepEqual(actualCard, expectedCard);

        const hand = state.players[0].hand;
        assert.equal(hand.length, 1);
        assert.deepEqual(hand[0], expectedCard);

        assert.equal(state.stack[type].length, modulesCount - 1);

        assert.equal(randomizer.diceCalls, 0);
        assert.equal(randomizer.shuffleCalls, 1);
    }
});

test.run();