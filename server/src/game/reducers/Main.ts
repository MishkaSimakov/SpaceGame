import Module, {isModule, ModuleType} from "@common/modules/Module";
import {Event} from "@common/events/Event";
import GameState from "../GameState";
import * as assert from "node:assert";
import {areCardSetsEqual} from "@common/Utils";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import * as Actions from '@common/actions/Main';
import {StateGetters} from "@common/getters/State";
import {SpaceshipModifiers} from "@common/modifiers/Spaceship";
import SmallQuantumProtector from "@common/modules/SmallQuantumProtector";
import {deactivateProtectorIfActive} from "@common/actions/Main";

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
    popCardFromHeap(state: GameState, {type}) {
        const stack = state.stack[type];

        assert.ok(stack.length > 0);

        stack.pop();
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
        const destructed = payload.positions.map(p => SpaceshipGetters.getModuleByPosition(player.spaceship, p));

        SpaceshipModifiers.removeModule(player.spaceship, destructed);

        const detached = SpaceshipGetters.getUnconnectedModules(player.spaceship);
        SpaceshipModifiers.removeModule(player.spaceship, detached);

        if (payload.destructedCardsDestiny === "hand") {
            player.hand.push(...destructed);
        } else {
            state.discards.module.push(...destructed);
        }

        if (payload.detachedCardsDestiny === "hand") {
            player.hand.push(...detached);
        } else {
            state.discards.module.push(...detached);
        }
    },

    pushCardsToStack(state: GameState, {type, cards}) {
        if (type === "module") {
            state.stack.module.push(...(cards as Module[]));
        } else {
            state.stack.event.push(...(cards) as Event[]);
        }
    },

    pushCardsToHand(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player);

        player.hand.push(...payload.cards);
    },

    changeModuleHealth(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player);
        const module = SpaceshipGetters.getModuleByPosition(player.spaceship, payload.position);

        module.health = Math.min(module.health + payload.delta, module.totalHealth);
    },

    popCardFromPlayerHand(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player);

        assert.ok(player.hand.length > payload.index);

        player.hand.splice(payload.index, 1);
    },

    deactivateProtectorIfActive(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player);

        player.spaceship.activatedProtector = undefined;
    },

    endFight(state: GameState) {
        assert.ok(state.fight !== undefined);

        state.fight = undefined;
    },

    activateProtector(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player);
        const protector = SpaceshipGetters.getModuleByPosition(player.spaceship, payload.position);

        assert.ok(player.spaceship.activatedProtector === undefined);
        assert.ok(protector)
        assert.ok(protector.type in [ModuleType.SmallQuantumProtector, ModuleType.QuantumProtector]);

        player.spaceship.activatedProtector = protector;
    },

    shiftFightTurnToNextPlayer(state: GameState) {
        assert.ok(state.fight !== undefined);

        state.fight.isFirstPlayerTurn = !state.fight.isFirstPlayerTurn;
    }
}