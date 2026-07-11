import {expect, test} from "vitest";

import {EventType} from "@common/Types";

import {beforeTurn} from "@src/game/sagas/phases/BeforeTurn";
import {attachReducers, fakeGameState, TestBus} from "./Utils";
import {choosePlayerForAttackResponse} from "@common/Actions";
import {runSaga} from "@src/game/sagas/runner/RunSaga";


test('attackLaterEventCard', async () => {
    const state = fakeGameState(2);
    const bus = new TestBus(state);

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

        bus.put(choosePlayerForAttackResponse(1));
    });

    bus.on("popCardsFromHand", (action) => {
        sequence.push("pop card");

        expect(action.payload.player).toEqual(0);
        expect(action.payload.indexes).toEqual([0]);
    });

    bus.on("pushCardsToDiscard", (action) => {
        sequence.push("discard card");

        expect(action.payload.cards.length).toEqual(1);
        const card = action.payload.cards[0];
        if (card.cardType !== "event") {
            expect.unreachable("discarded card must be an event card");
        }
        expect(card.event.type).toEqual(EventType.SaveCardAndThenAttack);
    });

    bus.on("beginFight", (action) => {
        sequence.push("begin fight");

        expect(action.payload.attacker).toEqual(0);
        expect(action.payload.victim).toEqual(1);

        // no one can attack => fight ends => await returns
    });

    await runSaga(bus.env, beforeTurn);

    expect(sequence).toEqual(["choose victim", "pop card", "discard card", "begin fight"]);
});