import {test} from "uvu";
import * as assert from "node:assert";

import {EventType} from "@common/Types";

import ActionsBus from "../../src/game/ActionsBus";
import {RunSaga} from "../../src/game/sagas/runner/RunSaga";
import {beforeTurn} from "../../src/game/sagas/phases/BeforeTurn";
import {fakeGameState} from "./Utils";
import {choosePlayerForAttackResponse} from "@common/Actions";

test('attackLaterEventCard', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();

    // fake state
    const cardIndex = state.stack.event.findIndex(card => card.type === EventType.SaveCardAndThenAttack);
    const card = state.stack.event[cardIndex];
    state.stack.event.splice(cardIndex, 1);

    const [attacker, victim] = state.players;

    attacker.id = 0;
    attacker.hand.push({cardType: "event", event: card});

    victim.id = 1;

    const runner = new RunSaga(state, bus, beforeTurn);

    enum TestPhase {
        INIT,
        CHOOSE_VICTIM_REQUESTED,
        CARD_POPPED_FROM_HAND,
        CARD_PUSHED_TO_DISCARDS,
        FIGHT_STARTED
    }

    let testPhase = TestPhase.INIT;

    bus.on("choosePlayerForAttackRequest", () => {
        console.log(1);
        assert.equal(testPhase, TestPhase.INIT);
        testPhase = TestPhase.CHOOSE_VICTIM_REQUESTED;

        bus.postpone(choosePlayerForAttackResponse(1));
    });

    bus.on("popCardsFromHand", (action) => {
        console.log(2);
        assert.equal(testPhase, TestPhase.CHOOSE_VICTIM_REQUESTED);
        testPhase = TestPhase.CARD_POPPED_FROM_HAND;

        assert.equal(action.payload.player, 0);
        assert.deepEqual(action.payload.indexes, [0]);
    });

    bus.on("pushCardsToDiscard", (action) => {
        console.log(3);
        assert.equal(testPhase, TestPhase.CHOOSE_VICTIM_REQUESTED);
        testPhase = TestPhase.CARD_PUSHED_TO_DISCARDS;

        assert.equal(action.payload.cards.length, 1);
        const card = action.payload.cards[0];
        assert.ok(card.cardType === "event");
        assert.equal(card.event.type, EventType.SaveCardAndThenAttack);
    });

    bus.on("beginFight", (action) => {
        console.log(4);
        assert.equal(testPhase, TestPhase.CARD_PUSHED_TO_DISCARDS);
        testPhase = TestPhase.FIGHT_STARTED;

        assert.equal(action.payload.attacker, 0);
        assert.equal(action.payload.victim, 1);

        runner.cancel("beforeTurn");
    });

    await runner.run();

    assert.equal(testPhase, TestPhase.FIGHT_STARTED);
});

test.run();