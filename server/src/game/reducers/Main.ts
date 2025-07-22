import {isModule} from "@common/modules/Module";
import {Event, EventTypes, isEvent} from "@common/events/Event";
import GameState from "../GameState";
import * as assert from "node:assert";
import {areCardSetsEqual} from "@common/Utils";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import * as Actions from '../actions/Main';

type ReducersType = {
    [Key in keyof typeof Actions]?:
    typeof Actions[Key] extends (...args: any[]) => { type: string, payload?: infer P }
        ? (state: GameState, payload: P) => void
        : never
};

export const reducers: ReducersType = {
    initGameState(state: GameState, payload) {
        Object.assign(state, payload.state);
    },
    playerRebuiltSpaceship(state: GameState, payload) {
        const currentPlayer = state.players[state.currentPlayerIndex];

        let oldPlayerCards = [...currentPlayer.spaceship.modules, ...currentPlayer.hand];
        let newPlayerCards = [...payload.newSpaceship.modules, ...payload.newHand];

        if (!areCardSetsEqual(oldPlayerCards, newPlayerCards)) {
            throw new Error("Changed player has wrong cards");
        }

        if (!SpaceshipGetters.checkConfiguration(payload.newSpaceship)) {
            throw new Error("Changed player has wrong spaceship configuration");
        }

        currentPlayer.spaceship = payload.newSpaceship;
        currentPlayer.hand = payload.newHand;

        currentPlayer.energy = Math.min(
            currentPlayer.energy,
            SpaceshipGetters.getTotalCapacity(currentPlayer.spaceship)
        );
    },
    useAttackLaterEventCard(state: GameState, payload) {
        let attackLaterCardIndex: number = state.getCurrentPlayer().hand
            .findIndex((c) => {
                if (isModule(c)) return false;

                return (c as Event).type === EventTypes.SaveCardAndThenAttack;
            });

        let discardedEventCard = state.getCurrentPlayer().hand.splice(attackLaterCardIndex, 1);
        state.discardCards(discardedEventCard);
    },

    playerDrawCardFromHeap(state: GameState, payload) {
        const stack = isEvent(payload.card) ? state.eventsStack : state.modulesStack;
        const card = stack.pop();
        const player = state.players.find(p => p.id === payload.player);

        // precondition
        assert.ok(stack.length > 0);
        // TODO: card === payload.card (add ids later and check this)

        player.hand.push(card);
    },

    shiftTurnToNextPlayer(state: GameState) {
        while (true) {
            state.currentPlayerIndex++;
            state.currentPlayerIndex %= state.players.length;

            const player = state.players[state.currentPlayerIndex];

            if (player.skipNextTurn) {
                player.skipNextTurn = false;
                continue;
            }

            if (player.lose) {
                continue;
            }

            break;
        }
    },

    collectEnergyBeforeTurn(state: GameState, payload) {
        const player = state.players.filter(p => p.id === payload.player)[0];

        player.energy += payload.amount;
    }
}