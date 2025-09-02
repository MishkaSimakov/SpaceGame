import {GameSettings, GameState, ModuleCard, ModuleType, Vector2} from "@common/Types";
import {Action} from "@common/ActionsHelpers";
import {shuffleResult, throwDiceResult} from "@common/Actions";

import ActionsBus from "../../src/game/ActionsBus";
import {defaultSettings} from "@src/game/DefaultSettings";
import {isReducerName, reducers} from "@src/game/reducers/Main";
import {getInitialGameState} from "@src/game/InitGameState";
import {ModuleInfo, modulesInfo} from "@common/cards/Modules";

export function fakeGameState(playersCount: number): GameState {
    const settings: GameSettings = {
        seed: "abracadabra",
        ...defaultSettings
    };

    const users = [];
    for (let i = 0; i < playersCount; ++i) {
        users.push({
            id: i,
            login: `player #${i}`
        })
    }

    const state = getInitialGameState(users, settings);

    for (const player of state.players) {
        const mainModule = state.mainModulesStack.pop()!;
        mainModule.x = 0;
        mainModule.y = 0;
        player.spaceship.modules.push(mainModule);
    }

    return state;
}

export function attachReducers(busRef: ActionsBus, stateRef: GameState) {
    busRef.on('*', (action: Action<string, any, any>) => {
        if (isReducerName(action.type)) {
            let copy = structuredClone(stateRef);

            // TODO: add typing
            // @ts-ignore
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

export function fakeModule(type: ModuleType, config: Partial<Omit<ModuleInfo, "configurations"> & Vector2>): ModuleCard {
    const defaultConfig = modulesInfo[type];

    return {
        id: 0,
        name: config.name ?? defaultConfig.name,
        connectors: {left: 1, top: 1, right: 1, bottom: 1},
        strength: config.strength ?? defaultConfig.strength ?? 0,
        capacity: config.strength ?? defaultConfig.capacity ?? 0,
        energyCost: config.energyCost ?? defaultConfig.energyCost ?? 0,
        energyIncrease: config.energyIncrease ?? defaultConfig.energyIncrease ?? 0,
        type: type,
        totalHealth: config.health ?? defaultConfig.health,
        health: config.health ?? defaultConfig.health,
        x: config.x ?? 0,
        y: config.y ?? 0,
        rotation: 0,
    }
}