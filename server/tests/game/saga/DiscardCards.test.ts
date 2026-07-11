import {expect, test} from "vitest";

import {ModuleGetters} from "@common/getters/Module";
import {discardCardsResponse} from "@common/Actions";

import {discardCards} from "@src/game/sagas/phases/DiscardCards";
import {runSaga} from "@src/game/sagas/runner/RunSaga";

import {attachReducers, fakeGameState, TestBus} from "../Utils";


test('doesntDiscardWhenNotEnoughCards', async () => {
    const state = fakeGameState(2);
    let player = state.players[0];

    const cardsCount = 4;

    for (let i = 0; i < cardsCount; ++i) {
        player.hand.push(ModuleGetters.asCard(state.stack.module.pop()!));
    }

    const bus = new TestBus(state);

    bus.on('discardCardsRequest', () => {
        expect.unreachable("player must not be asked to discard cards");
    });

    await runSaga(bus.env, discardCards);

    // test
    player = state.players[0];

    expect(player.hand.length).toEqual(4);
});

test('discardCardsWhenThereAreTooMany', async () => {
    const state = fakeGameState(2);

    let player = state.players[0];

    const cardsCount = 6;

    for (let i = 0; i < cardsCount; ++i) {
        player.hand.push(ModuleGetters.asCard(state.stack.module.pop()!));
    }

    const expectedCards = [player.hand[0], player.hand[5]];

    const bus = new TestBus(state);

    attachReducers(bus, state);
    bus.on('discardCardsRequest', () => {
        bus.put(discardCardsResponse([1, 2, 3, 4]));
    });

    await runSaga(bus.env, discardCards);

    // test
    player = state.players[0];

    expect(player.hand.length).toEqual(2);
    expect(player.hand[0]).toEqual(expectedCards[0]);
    expect(player.hand[1]).toEqual(expectedCards[1]);
});