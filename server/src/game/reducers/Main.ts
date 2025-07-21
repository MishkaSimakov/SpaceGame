import {DeepReadonly} from "../../../../common/Types";
import {GameSettings} from "../../../../common/GameSettings";
import {isModule} from "../../../../common/modules/Module";
import {Event, EventTypes} from "../../../../common/events/Event";
import GameState from "../GameState";
import {PlayerId} from "../../../../common/Player";
import * as assert from "node:assert";

export const reducers = {
    initGameState(state: GameState, settings: DeepReadonly<GameSettings>, payload: { state: GameState }) {
        Object.assign(state, payload.state);
    },
    useAttackLaterEventCard(state: GameState, settings: DeepReadonly<GameSettings>, payload: {
        attacker: PlayerId,
        victim: PlayerId
    }) {
        let attackLaterCardIndex: number = state.getCurrentPlayer().hand
            .findIndex((c) => {
                if (isModule(c)) return false;

                return (c as Event).type === EventTypes.SaveCardAndThenAttack;
            });

        let discardedEventCard = state.getCurrentPlayer().hand.splice(attackLaterCardIndex, 1);
        state.discardCards(discardedEventCard);

        this.beginFight(state, settings, payload);
    },

    beginFight(state: GameState, settings: DeepReadonly<GameSettings>, payload: {
        attacker: PlayerId,
        victim: PlayerId
    }) {
        assert.equal(state.fight, undefined);

        state.fight = {
            first: payload.attacker,
            second: payload.victim,
            isFirstPlayerTurn: true,
            isFightEnded: false
        }
    }
}