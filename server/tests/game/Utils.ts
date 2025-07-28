import GameState from "../../src/game/GameState";
import Player from "@common/Player";
import Spaceship from "@common/Spaceship";
import {GameSettings} from "@common/GameSettings";
import ActionsBus from "../../src/game/actions/ActionsBus";
import {Action} from "../../src/game/actions/Action";
import {reducers} from "game/reducers/Main";
import {IRandomizer} from "../../src/game/SagaRunner";

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

export class CountingRandomizer implements IRandomizer {
    shuffleCalls = 0;
    diceCalls = 0;

    dice(): number {
        this.diceCalls += 1;
        return 0;
    }

    shuffle<T>(array: T[]): T[] {
        this.shuffleCalls += 1;
        return array;
    }
}