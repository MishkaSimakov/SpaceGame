import {test} from "uvu";
import * as assert from "uvu/assert";

import {EventType} from "@common/Types";

import ActionsBus from "../../src/game/ActionsBus";
import {beforeTurn} from "@src/game/sagas/phases/BeforeTurn";
import {fakeGameState} from "./Utils";
import {choosePlayerForAttackResponse} from "@common/Actions";
import {runSaga} from "@src/game/sagas/runner/RunSaga";
import {DeactivateSignal} from "@src/game/middlewares/DeactivateSignal";

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


    const sequence: string[] = [];

    bus.on("choosePlayerForAttackRequest", () => {
        sequence.push("choose victim");

        bus.emit(choosePlayerForAttackResponse(1));
    });

    bus.on("popCardsFromHand", (action) => {
        sequence.push("pop card");

        assert.equal(action.payload.player, 0);
        assert.equal(action.payload.indexes, [0]);
    });

    bus.on("pushCardsToDiscard", (action) => {
        sequence.push("discard card");

        assert.equal(action.payload.cards.length, 1);
        const card = action.payload.cards[0];
        assert.ok(card.cardType === "event");
        assert.equal(card.event.type, EventType.SaveCardAndThenAttack);
    });

    bus.on("beginFight", (action) => {
        sequence.push("begin fight");

        assert.equal(action.payload.attacker, 0);
        assert.equal(action.payload.victim, 1);

        throw new DeactivateSignal();
    });

    try {
        await runSaga({state, bus}, beforeTurn);
    } catch (error) {
        assert.ok(error instanceof DeactivateSignal);
    }

    assert.equal(sequence, ["choose victim", "pop card", "discard card", "begin fight"]);
});

test.run();