import * as assert from "node:assert";

import * as Actions from "@common/Actions"
import {StateGetters} from "@common/getters/State";
import {CardType, GameState, TimeRecordType} from "@common/Types";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {SpaceshipModifiers} from "@common/modifiers/Spaceship";
import {ModuleGetters} from "@common/getters/Module";


type ReducersType = {
    [Key in keyof typeof Actions]?:
    typeof Actions[Key] extends (...args: any[]) => { type: string, payload: infer P }
        ? (state: GameState, payload: P) => void
        : never
};

export const reducers: ReducersType = {
    initGameState(state: GameState, payload) {
        Object.assign(state, payload.state);
    },
    playerRebuiltSpaceship(state: GameState, payload) {
        const currentPlayer = StateGetters.currentPlayer(state);

        currentPlayer.spaceship = payload.newSpaceship;
        currentPlayer.hand = payload.newHand;

        currentPlayer.energy = Math.min(
            currentPlayer.energy,
            SpaceshipGetters.getTotalCapacity(currentPlayer.spaceship)
        );
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

    setCurrentPlayer(state: GameState, payload) {
        state.currentPlayerId = payload.player;
    },

    changePlayerEnergy(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player)!;
        const capacity = SpaceshipGetters.getTotalCapacity(player.spaceship);

        player.energy += payload.delta;
        player.energy = Math.max(0, Math.min(player.energy, capacity));
    },

    setPlayerSkipNextTurn(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player)!;
        player.skipNextTurn = payload.skip;
    },

    destructSpaceshipModules(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player)!;
        const destructed = payload.positions.map(p => SpaceshipGetters.getModuleByPosition(player.spaceship, p)!);

        SpaceshipModifiers.removeModule(player.spaceship, destructed);

        const detached = SpaceshipGetters.getUnconnectedModules(player.spaceship);
        SpaceshipModifiers.removeModule(player.spaceship, detached);

        if (payload.destructedCardsDestiny === "hand") {
            player.hand.push(...destructed.map(module => ({cardType: "module" as const, module})));
        } else {
            state.discards.module.push(...destructed);
        }

        if (payload.detachedCardsDestiny === "hand") {
            player.hand.push(...detached.map(module => ({cardType: "module" as const, module})));
        } else {
            state.discards.module.push(...detached);
        }
    },

    changeModuleHealth(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player)!;
        const module = SpaceshipGetters.getModuleByPosition(player.spaceship, payload.position)!;

        module.health = Math.min(module.health + payload.delta, module.totalHealth);
    },

    deactivateProtectorIfActive(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player)!;

        player.spaceship.activatedProtector = undefined;
    },

    endFight(state: GameState) {
        assert.ok(state.fight !== undefined);

        state.fight = undefined;
    },

    activateProtector(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player)!;
        const protector = SpaceshipGetters.getModuleByPosition(player.spaceship, payload.position);

        assert.ok(player.spaceship.activatedProtector === undefined);
        assert.ok(protector);
        assert.ok(ModuleGetters.isProtector(protector));

        player.spaceship.activatedProtector = payload.position;
    },

    shiftFightTurnToNextPlayer(state: GameState) {
        assert.ok(state.fight !== undefined);

        state.fight.isFirstPlayerTurn = !state.fight.isFirstPlayerTurn;
    },

    removeSpaceshipModules(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player)!;

        for (const position of payload.positions) {
            assert.ok(SpaceshipGetters.getModuleByPosition(player.spaceship, position));

            SpaceshipModifiers.removeModule(player.spaceship, position.x, position.y);
        }
    },

    playerLost(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player)!;

        assert.ok(!player.lose);

        player.lose = true;
    },

    addTimeRecord(state: GameState, payload) {
        assert.ok(state.settings.timeControlSettings);

        state.timeRecords.push({
            playerId: payload.player,
            type: payload.type,
            time: payload.time
        });
    },

    changePlayerTime(state: GameState, payload) {
        assert.ok(state.settings.timeControlSettings);

        const player = StateGetters.playerById(state, payload.player)!;
        player.time += payload.delta;
    },

    playerUseModuleSecondTime(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player)!;

        assert.ok(!player.usedModuleSecondTimeOnThisTurn);

        player.usedModuleSecondTimeOnThisTurn = true;
    },

    insertPause(state: GameState, {begin, end}) {
        const currentPlayer = StateGetters.currentPlayer(state);

        state.timeRecords.push(
            {type: TimeRecordType.PAUSE_STARTED, playerId: currentPlayer.id, time: begin},
            {type: TimeRecordType.PAUSE_ENDED, playerId: currentPlayer.id, time: end},
        );
    },

    // # Cards manipulations
    // ## hand
    popCardsFromHand(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player);

        assert.ok(player);
        assert.ok(player.hand.length > Math.max(...payload.indexes));

        player.hand = player.hand.filter((card, index) => {
            return payload.indexes.indexOf(index) === -1;
        });
    },
    pushCardsToHand(state: GameState, payload) {
        const player = StateGetters.playerById(state, payload.player)!;

        player.hand.push(...payload.cards);
    },

    // ## stack
    popCardFromStack(state: GameState, {type}) {
        const stack = type === CardType.Module
            ? state.stack.module
            : state.stack.event;

        assert.ok(stack.length > 0);

        stack.pop();
    },
    pushCardsToStack(state: GameState, {cards}) {
        for (const card of cards) {
            if (card.cardType === "module") {
                state.stack.module.push(card.module);
            } else {
                state.stack.event.push(card.event);
            }
        }
    },

    // ## discards
    pushCardsToDiscard(state: GameState, {cards}) {
        for (const card of cards) {
            if (card.cardType === "module") {
                card.module.health = card.module.totalHealth;
                state.discards.module.push(card.module);
            } else {
                state.discards.event.push(card.event);
            }
        }
    },
    clearDiscard(state: GameState, {type}) {
        if (type === CardType.Module) {
            state.discards.module = [];
        } else {
            state.discards.event = [];
        }
    },
}

export function isReducerName(name: string): name is keyof ReducersType {
    return name in reducers;
}