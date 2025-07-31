import GameState from "../../src/game/GameState";
import Player from "@common/Player";
import Spaceship from "@common/Spaceship";
import {GameSettings} from "@common/GameSettings";
import ActionsBus from "@common/actions/ActionsBus";
import {Action} from "@common/actions/Action";
import {reducers} from "game/reducers/Main";
import {shuffle, shuffleResult, throwDice, throwDiceResult} from "@common/actions/Random";

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
    busRef.on('*', (action: Action) => {
        if (action.type in reducers) {
            let copy = structuredClone(stateRef);
            reducers[action.type](copy, action.payload);

            Object.assign(stateRef, copy);
        }
    });
}

export function attachTerminalLogger(busRef: ActionsBus) {
    busRef.on('*', (action: Action) => {
        console.log("📢", action.type, action);
    });
}

export function attachFakeRandomizer(busRef: ActionsBus) {
    const diceCalls = {value: 0};
    const shuffleCalls = {value: 0};

    busRef.on(throwDice, () => {
        diceCalls.value += 1;

        busRef.emit(throwDiceResult(1));
    });

    busRef.on(shuffle, (action: ReturnType<typeof shuffle>) => {
        shuffleCalls.value += 1;

        const result = new Array(action.payload.length);
        for (let i = 0; i < result.length; ++i) {
            result[i] = i;
        }

        busRef.emit(shuffleResult(result));
    });

    return {diceCalls, shuffleCalls};
}