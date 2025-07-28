import Module, {isModule} from "@common/modules/Module";
import {Event, EventTypes, isEvent} from "@common/events/Event";
import GameState from "../GameState";
import * as assert from "node:assert";
import {areCardSetsEqual} from "@common/Utils";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import * as Actions from '../actions/Main';
import {StateGetters} from "@common/getters/State";
import {SpaceshipModifiers} from "@common/modifiers/Spaceship";

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
    disposeCardsFromPlayerHand(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player);

        assert.ok(player);
        assert.ok(player.hand.length > Math.max(...payload.indices));

        player.hand = player.hand.filter((card, index) => {
            if (payload.indices.indexOf(index) === -1) {
                return true;
            }

            if (isModule(card)) {
                state.discards.module.push(card);
            } else {
                state.discards.event.push(card);
            }

            return false;
        });
    },
    beginFight(state: GameState, payload) {
        assert.equal(state.fight, undefined);

        state.fight = {
            first: payload.attacker,
            second: payload.victim,
            isFirstPlayerTurn: true,
            isFightEnded: false
        };
    },
    playerDrawCardFromHeap(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player);

        const stack = isEvent(payload.card) ? state.stack.event : state.stack.module;
        const card = stack.pop();

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

    changePlayerEnergy(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player);
        const capacity = SpaceshipGetters.getTotalCapacity(player.spaceship);

        player.energy += payload.delta;
        player.energy = Math.max(0, Math.min(player.energy, capacity));
    },

    returnDiscardsToStack(state: GameState, {type, discards}) {
        if (type === "module") {
            state.stack.module = discards as Module[];
            state.discards.module = [];
        } else {
            state.stack.event = discards as Event[];
            state.discards.event = [];
        }
    },

    playerSkipNextTurn(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player);
        player.skipNextTurn = true;
    },

    destructSpaceshipModules(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player);
        const modules = payload.positions.map(p => SpaceshipGetters.getModuleByPosition(player.spaceship, p));

        SpaceshipModifiers.removeModule(player.spaceship, modules);

        const unconnected = SpaceshipGetters.getUnconnectedModules(player.spaceship);
        modules.push(...unconnected);

        SpaceshipModifiers.removeModule(player.spaceship, unconnected);

        if (payload.cardsDestiny === "hand") {
            player.hand.push(...modules);
        } else {
            state.discards.module.push(...modules);
        }
    },

    pushCurrentEventToPlayerHand(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player);

        assert.ok(state.currentEvent !== undefined);

        player.hand.push(state.currentEvent);
        state.currentEvent = undefined;
    }
}