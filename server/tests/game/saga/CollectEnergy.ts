import {test} from "uvu";
import * as assert from "uvu/assert";

import {GameState, ModuleType} from "@common/Types";

import {attachReducers, fakeGameState, fakeModule} from '../Utils';
import ActionsBus from '../../../src/game/ActionsBus';
import {collectEnergy} from '@src/game/sagas/phases/CollectEnergy';
import {runSaga} from "@src/game/sagas/runner/RunSaga";
import {Channel} from "@src/game/sagas/runner/Channel";
import {GameInput} from "@src/game/sagas/runner/Environment";


test('collectEnergyWithIncomeLessThanCapacity', async () => {
    // Setup: Create a game state with one player, Command Module, and Solar Panel
    const state: GameState = fakeGameState(1);
    let player = state.players[0];
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    // Add Solar Panel to the spaceship
    const solarPanel = fakeModule(ModuleType.SolarPanel, {
        x: 1,
        y: 0
    });
    player.spaceship.modules.push(solarPanel);
    player.energy = 0; // Initial energy

    // Attach reducers to handle state updates
    attachReducers(bus, state);

    // Run the collectEnergy saga
    await runSaga({state, output: bus, input}, collectEnergy);

    // test
    player = state.players[0];

    assert.equal(player.energy, 2);
});

test('collectEnergyWithIncomeGreaterThanCapacity', async () => {
    // Setup: Create a game state with one player, Command Module, and Dark Matter Generator
    const state: GameState = fakeGameState(1);
    let player = state.players[0];
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    // Add Dark Matter Generator to the spaceship
    const darkMatterGenerator1 = fakeModule(ModuleType.DarkMatterGenerator, {
        x: 1,
        y: 0
    });
    player.spaceship.modules.push(darkMatterGenerator1);

    const darkMatterGenerator2 = fakeModule(ModuleType.DarkMatterGenerator, {
        x: 2,
        y: 0
    });
    player.spaceship.modules.push(darkMatterGenerator2);

    player.energy = 0; // Initial energy

    // Attach reducers to handle state updates
    attachReducers(bus, state);

    // Run the collectEnergy saga
    await runSaga({state, output: bus, input}, collectEnergy);

    // test
    player = state.players[0];

    assert.equal(player.energy, 5);
});

test('collectEnergyWithSumGreaterThanCapacity', async () => {
    // Setup: Create a game state with one player, Command Module, and Dark Matter Generator
    const state: GameState = fakeGameState(1);
    let player = state.players[0];
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    // Add Dark Matter Generator to the spaceship
    const darkMatterGenerator1 = fakeModule(ModuleType.DarkMatterGenerator, {
        x: 1,
        y: 0
    });
    player.spaceship.modules.push(darkMatterGenerator1);

    player.energy = 2; // Initial energy

    // Attach reducers to handle state updates
    attachReducers(bus, state);

    // Run the collectEnergy saga
    await runSaga({state, output: bus, input}, collectEnergy);

    // test
    // 2 (initial) + 3 (dark matter generator) + 1 (main module) > 5 (main module capacity)
    player = state.players[0];

    assert.equal(player.energy, 5);
});

test.run();