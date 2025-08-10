import {Action} from "@common/actions/Action";
import Spaceship from "@common/Spaceship";
import Player from "@common/Player";
import {GameSettings} from "@common/GameSettings";
import Actions from "@common/actions/Main"

import GameState from "../../src/game/GameState";
import ActionsBus from "../../src/game/ActionsBus";
import {reducers} from "../../src/game/reducers/Main";

const {throwDiceResult, shuffleResult} = Actions;

export function fakeGameState(playersCount: number): GameState {
    const state = new GameState();

    const settings = new GameSettings();
    settings.size = playersCount;

    state.settings = settings;
    state.currentPlayerIndex = 0;

    for (let i = 0; i < playersCount; ++i) {
        const player = new Player();

        player.id = i;
        player.name = `player #${i}`;

        const mainModule = state.mainModules.pop();
        mainModule.x = 0;
        mainModule.y = 0;

        player.spaceship = new Spaceship();
        player.spaceship.modules.push(mainModule);

        state.players.push(player)
    }

    return state;
}

export function attachReducers(busRef: ActionsBus, stateRef: GameState) {
    busRef.on('*', (action: Action<string, any, any>) => {
        if (action.type in reducers) {
            let copy = structuredClone(stateRef);
            reducers[action.type](copy, action.payload);

            Object.assign(stateRef, copy);
        }
    });
}

export function attachTerminalLogger(busRef: ActionsBus) {
    busRef.on('*', (action: Action<string, any, any>) => {
        console.log("📢", action.type, action);
    });
}

export function attachFakeRandomizer(busRef: ActionsBus) {
    const diceCalls = {value: 0};
    const shuffleCalls = {value: 0};

    busRef.on('throwDice', () => {
        diceCalls.value += 1;

        busRef.emit(throwDiceResult(1));
    });

    busRef.on('shuffle', (action) => {
        shuffleCalls.value += 1;

        const result = new Array(action.payload.length);
        for (let i = 0; i < result.length; ++i) {
            result[i] = i;
        }

        busRef.emit(shuffleResult(result));
    });

    return {diceCalls, shuffleCalls};
}