import * as assert from "node:assert";

import {GameSettings, GameState, MainModuleType, ModuleCard, ModuleType, Vector2} from "@common/Types";
import {Action} from "@common/ActionsHelpers";
import {shuffleResult, throwDiceResult} from "@common/Actions";
import {defaultSettings} from "@src/game/DefaultSettings";
import {isReducerName, reducers} from "@src/game/reducers/Main";
import {getInitialGameState} from "@src/game/InitGameState";
import {mainModulesInfo, ModuleInfo, modulesInfo} from "@common/cards/Modules";
import {Channel} from "@src/game/sagas/runner/Channel";
import {Environment} from "@src/game/sagas/runner/Environment";

let idCounter = 0;

type TestListener = (action: Action<string, any, any>) => void;

/**
 * Drives a saga over the two channels it expects, dispatching each emitted action to listeners
 * registered by type ('*' receives every action).
 *
 * The receiver is registered on `output` in the constructor, before any saga runs: `put` hands an
 * action to a waiting receiver synchronously and only then resumes the saga, so a saga whose
 * output has nobody listening blocks on its first `put` and never returns.
 *
 * A listener answers the saga by calling `put`, which queues the response on `input` in time for
 * the saga's next `take`.
 */
export class TestBus {
    readonly input = new Channel<Action>();
    readonly output = new Channel<Action>();

    private listeners = new Map<string, TestListener[]>();

    constructor(private stateRef: GameState) {
        this.receiveNext();
    }

    get env(): Environment {
        return {state: this.stateRef, input: this.input, output: this.output};
    }

    on(type: string, listener: TestListener) {
        const existing = this.listeners.get(type);

        if (existing) {
            existing.push(listener);
        } else {
            this.listeners.set(type, [listener]);
        }
    }

    put(action: Action<string, any, any>) {
        this.input.put(action);
    }

    private receiveNext() {
        this.output.take((action) => {
            const listeners = [
                ...(this.listeners.get(action.type) ?? []),
                ...(this.listeners.get('*') ?? [])
            ];

            for (const listener of listeners) {
                listener(action);
            }

            this.receiveNext();
        });
    }
}

export function assertModulesEqual(actual: ModuleCard[], expected: ModuleCard[]) {
    const sort = (modules: ModuleCard[]) => {
        return modules
            .sort((a, b) => a.id - b.id);
    };

    const actualSet = sort(actual);
    const expectedSet = sort(expected);

    assert.equal(actualSet.length, expectedSet.length);
    for (let i = 0; i < actualSet.length; ++i) {
        assert.equal(actualSet[i], expectedSet[i]);
    }
}

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

export function attachReducers(busRef: TestBus, stateRef: GameState) {
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

export function attachTerminalLogger(busRef: TestBus) {
    busRef.on('*', (action: Action<string, any, any>) => {
        console.log("📢", action.type, action);
    });
}

export function attachFakeRandomizer(busRef: TestBus) {
    const diceCalls = {value: 0};
    const shuffleCalls = {value: 0};

    busRef.on('throwDice', () => {
        diceCalls.value += 1;

        busRef.put(throwDiceResult(1));
    });

    busRef.on('shuffle', (action) => {
        shuffleCalls.value += 1;

        const result = new Array(action.payload.length);
        for (let i = 0; i < result.length; ++i) {
            result[i] = i;
        }

        busRef.put(shuffleResult(result));
    });

    return {diceCalls, shuffleCalls};
}

export function fakeModule(type: ModuleType, config: Partial<Omit<ModuleInfo, "configurations"> & Vector2>): ModuleCard {
    const defaultConfig = type !== ModuleType.MainModule
        ? modulesInfo[type]
        : mainModulesInfo[MainModuleType.DrawAdditionalModuleCard];

    return {
        id: idCounter++,
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
