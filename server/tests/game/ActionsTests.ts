import {test} from "uvu";
import * as assert from "node:assert";

import Player from "@common/Player";
import {EventTypes} from "@common/events/Event";
import Actions from "@common/actions/Main";

import GameState from "../../src/game/GameState";
import ActionsBus from "../../src/game/ActionsBus";
import {SagaRunner} from "../../src/game/sagas/SagaRunner";
import {beforeTurn} from "../../src/game/sagas/phases/BeforeTurn";

const {choosePlayerForAttackResponse} = Actions;

test('attackLaterEventCard', async () => {
    const state = new GameState();
    const bus = new ActionsBus();

    // fake state
    const cardIndex = state.stack.event.findIndex(card => card.type === EventTypes.SaveCardAndThenAttack);
    const card = state.stack.event[cardIndex];
    state.stack.event.splice(cardIndex, 1);

    const fakeAttacker = new Player();
    fakeAttacker.id = 0;
    fakeAttacker.hand.push(card);

    const fakeVictim = new Player();
    fakeVictim.id = 1;

    state.players.push(fakeAttacker, fakeVictim);
    state.currentPlayerIndex = 0;

    const runner = new SagaRunner(state, bus, beforeTurn);

    enum TestPhase {
        INIT,
        CHOOSE_VICTIM_REQUESTED,
        CARD_DISPOSED,
        FIGHT_STARTED
    }

    let testPhase = TestPhase.INIT;

    bus.on("choosePlayerForAttackRequest", () => {
        assert.equal(testPhase, TestPhase.INIT);
        testPhase = TestPhase.CHOOSE_VICTIM_REQUESTED;

        bus.emit(choosePlayerForAttackResponse(1));
    });

    bus.on("disposeCardsFromPlayerHand", (action) => {
        assert.equal(testPhase, TestPhase.CHOOSE_VICTIM_REQUESTED);
        testPhase = TestPhase.CARD_DISPOSED;

        assert.equal(action.payload.player, 0);
        assert.deepEqual(action.payload.indices, [0]);
    });

    bus.on("beginFight", (action) => {
        assert.equal(testPhase, TestPhase.CARD_DISPOSED);
        testPhase = TestPhase.FIGHT_STARTED;

        assert.equal(action.payload.attacker, 0);
        assert.equal(action.payload.victim, 1);

        runner.cancel("beforeTurn");
    });

    await runner.run();

    assert.equal(testPhase, TestPhase.FIGHT_STARTED);
});

test.run();