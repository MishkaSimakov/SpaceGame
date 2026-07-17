import {expect, test} from "vitest";

import {attachFakeRandomizer, attachReducers, fakeGameState, TestBus} from "../Utils";
import {popOneCard} from "@src/game/sagas/components/PopCards";
import {CardType} from "@common/Types";
import {runSaga} from "@src/game/sagas/runner/RunSaga";

test('drawOneCard', async () => {
    for (const type of ["module", "event"] as const) {
        const state = fakeGameState(2);
        const bus = new TestBus(state);

        attachReducers(bus, state);

        const modulesCount = state.stack[type].length;
        const expectedCard: any = {cardType: type};
        expectedCard[type] = state.stack[type][modulesCount - 1];

        const {diceCalls, shuffleCalls} = attachFakeRandomizer(bus);

        const actualCard = await runSaga(
            bus.env,
            popOneCard, type === "module" ? CardType.Module : CardType.Event
        );

        expect(actualCard).toEqual(expectedCard);

        expect(state.stack[type].length).toEqual(modulesCount - 1);

        expect(diceCalls.value).toEqual(0);
        expect(shuffleCalls.value).toEqual(0);
    }
});

test('drawOneCardWithDiscards', async () => {
    for (const type of ["module", "event"] as const) {
        const state = fakeGameState(2);
        const bus = new TestBus(state);

        state.discards.event = state.stack.event;
        state.discards.module = state.stack.module;
        state.stack.event = [];
        state.stack.module = [];

        attachReducers(bus, state);

        const modulesCount = state.discards[type].length;
        const expectedCard: any = {cardType: type};
        expectedCard[type] = state.discards[type][modulesCount - 1];

        const {diceCalls, shuffleCalls} = attachFakeRandomizer(bus);

        const actualCard = await runSaga(
            bus.env,
            popOneCard, type === "module" ? CardType.Module : CardType.Event
        );

        expect(actualCard).toEqual(expectedCard);

        expect(state.stack[type].length).toEqual(modulesCount - 1);

        expect(diceCalls.value).toEqual(0);
        expect(shuffleCalls.value).toEqual(1);
    }
});
