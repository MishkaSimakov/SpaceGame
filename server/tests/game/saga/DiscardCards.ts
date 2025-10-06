import {test} from "uvu";
import * as assert from "uvu/assert";

import {ModuleGetters} from "@common/getters/Module";
import {discardCardsResponse} from "@common/Actions";

import {attachReducers, fakeGameState} from "../Utils";
import ActionsBus from "../../../src/game/ActionsBus";
import {discardCards} from "@src/game/sagas/phases/DiscardCards";
import {runSaga} from "@src/game/sagas/runner/RunSaga";
import {GameInput} from "@src/game/sagas/runner/Environment";
import {Channel} from "@src/game/sagas/runner/Channel";


test('doesntDiscardWhenNotEnoughCards', async () => {
    const state = fakeGameState(2);
    let player = state.players[0];
    const input: GameInput = new Channel();

    const cardsCount = 4;

    for (let i = 0; i < cardsCount; ++i) {
        player.hand.push(ModuleGetters.asCard(state.stack.module.pop()!));
    }

    const bus = new ActionsBus();

    bus.on('discardCardsRequest', () => {
        assert.unreachable("player must not be asked to discard cards");
    });

    await runSaga({state, output: bus, input}, discardCards);

    // test
    player = state.players[0];

    assert.equal(player.hand.length, 4);
});

test('discardCardsWhenThereAreTooMany', async () => {
    const state = fakeGameState(2);
    const input: GameInput = new Channel();

    let player = state.players[0];

    const cardsCount = 6;

    for (let i = 0; i < cardsCount; ++i) {
        player.hand.push(ModuleGetters.asCard(state.stack.module.pop()!));
    }

    const expectedCards = [player.hand[0], player.hand[5]];

    const bus = new ActionsBus();

    attachReducers(bus, state);
    bus.on('discardCardsRequest', () => {
        input.put(discardCardsResponse([1, 2, 3, 4]));
    });

    await runSaga({state, output: bus, input}, discardCards);

    // test
    player = state.players[0];

    assert.equal(player.hand.length, 2);
    assert.equal(player.hand[0], expectedCards[0]);
    assert.equal(player.hand[1], expectedCards[1]);
});

test.run();