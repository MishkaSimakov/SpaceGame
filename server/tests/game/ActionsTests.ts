import {test} from "uvu";
import * as assert from "uvu/assert";

import {EventType} from "@common/Types";

import ActionsBus from "../../src/game/ActionsBus";
import {beforeTurn} from "@src/game/sagas/phases/BeforeTurn";
import {attachReducers, fakeGameState} from "./Utils";
import {choosePlayerForAttackResponse} from "@common/Actions";
import {runSaga} from "@src/game/sagas/runner/RunSaga";
import {Channel} from "@src/game/sagas/runner/Channel";
import {deactivateSignal} from "@src/game/sagas/runner/Signals";
import {GameInput} from "@src/game/sagas/runner/Environment";


test('attackLaterEventCard', async () => {
    const state = fakeGameState(2);
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    // fake state
    const cardIndex = state.stack.event.findIndex(card => card.type === EventType.SaveCardAndThenAttack);
    const card = state.stack.event[cardIndex];
    state.stack.event.splice(cardIndex, 1);

    const [attacker, victim] = state.players;

    attacker.id = 0;
    attacker.hand.push({cardType: "event", event: card});

    victim.id = 1;


    const sequence: string[] = [];

    attachReducers(bus, state);

    bus.on("choosePlayerForAttackRequest", () => {
        sequence.push("choose victim");

        input.put(choosePlayerForAttackResponse(1));
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

        // no one can attack => fight ends => await returns
    });

    await runSaga({state, output: bus, input}, beforeTurn);

    assert.equal(sequence, ["choose victim", "pop card", "discard card", "begin fight"]);
});

test.run();