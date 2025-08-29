import {test} from "uvu";
import * as assert from "uvu/assert";

import ActionsBus from "../../../src/game/ActionsBus";
import {attachFakeRandomizer, attachReducers, attachTerminalLogger, fakeGameState} from "../Utils";
import {popOneCard} from "@src/game/sagas/components/PopCards";
import {CardType} from "@common/Types";
import {runSaga} from "@src/game/sagas/runner/RunSaga";

test('drawOneCard', async () => {
    for (const type of ["module", "event"] as const) {
        const state = fakeGameState(2);
        const bus = new ActionsBus();

        attachReducers(bus, state);

        const modulesCount = state.stack[type].length;
        let expectedCard: any = {cardType: type};
        expectedCard[type] = state.stack[type][modulesCount - 1];

        const {diceCalls, shuffleCalls} = attachFakeRandomizer(bus);
        attachTerminalLogger(bus);

        const actualCard = await runSaga(
            {state, bus},
            popOneCard, type === "module" ? CardType.Module : CardType.Event
        );

        assert.equal(actualCard, expectedCard);

        console.log(modulesCount);
        assert.equal(state.stack[type].length, modulesCount - 1);

        assert.equal(diceCalls.value, 0);
        assert.equal(shuffleCalls.value, 0);
    }
});

test('drawOneCardWithDiscards', async () => {
    for (const type of ["module", "event"] as const) {
        const state = fakeGameState(2);
        const bus = new ActionsBus();

        state.discards.event = state.stack.event;
        state.discards.module = state.stack.module;
        state.stack.event = [];
        state.stack.module = [];

        attachReducers(bus, state);

        const modulesCount = state.discards[type].length;
        let expectedCard: any = {cardType: type};
        expectedCard[type] = state.discards[type][modulesCount - 1];

        const {diceCalls, shuffleCalls} = attachFakeRandomizer(bus);

        const actualCard = await runSaga(
            {state, bus},
            popOneCard, type === "module" ? CardType.Module : CardType.Event
        );

        assert.equal(actualCard, expectedCard);

        assert.equal(state.stack[type].length, modulesCount - 1);

        assert.equal(diceCalls.value, 0);
        assert.equal(shuffleCalls.value, 1);
    }
});

test.run();