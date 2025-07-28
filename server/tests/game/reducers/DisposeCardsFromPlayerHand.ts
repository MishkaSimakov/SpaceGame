import {test} from "uvu";
import * as assert from "node:assert";
import {reducers} from "../../../src/game/reducers/Main";
import {fakeGameState} from "../Utils";


test('disposeAllCards', async () => {
    const state = fakeGameState(2);
    const player = state.players[0];

    player.hand = state.stack.module.splice(0, 4);
    reducers.disposeCardsFromPlayerHand(state, {
        player: player.id,
        indices: [0, 1, 2, 3]
    });

    assert.equal(player.hand.length, 0);
    assert.equal(state.discards.module.length, 4);
});

test('disposeOneCard', async () => {
    const state = fakeGameState(2);
    const player = state.players[0];

    player.hand = state.stack.module.splice(0, 4);

    const expectedCard = player.hand[1];

    reducers.disposeCardsFromPlayerHand(state, {
        player: player.id,
        indices: [1]
    });

    assert.equal(player.hand.length, 3);
    assert.equal(state.discards.module.length, 1);
    assert.deepEqual(state.discards.module[0], expectedCard);
});

test.run();