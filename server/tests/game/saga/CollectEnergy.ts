import {test} from 'uvu';
import {fakeGameState, attachReducers} from '../Utils';
import ActionsBus from '../../../src/game/ActionsBus';
import SolarPanel from '@common/modules/SolarPanel';
import DarkMatterGenerator from '@common/modules/DarkMatterGenerator';

import GameState from '../../../src/game/GameState';
import {SagaRunner} from '../../../src/game/sagas/SagaRunner';
import {collectEnergy} from '../../../src/game/sagas/phases/CollectEnergy';
import * as assert from "node:assert";

test('collectEnergyWithIncomeLessThanCapacity', async () => {
    // Setup: Create a game state with one player, Command Module, and Solar Panel
    const state: GameState = fakeGameState(1);
    let player = state.players[0];
    const bus = new ActionsBus();

    // Add Solar Panel to the spaceship
    const solarPanel = new SolarPanel(1, 1, 1, 1);
    solarPanel.x = 1;
    solarPanel.y = 0;
    player.spaceship.modules.push(solarPanel);
    player.energy = 0; // Initial energy

    // Attach reducers to handle state updates
    attachReducers(bus, state);

    // Run the collectEnergy saga
    const runner = new SagaRunner(state, bus, collectEnergy);
    await runner.run();

    // test
    player = state.players[0];

    assert.equal(player.energy, 2);
});

test('collectEnergyWithIncomeGreaterThanCapacity', async () => {
    // Setup: Create a game state with one player, Command Module, and Dark Matter Generator
    const state: GameState = fakeGameState(1);
    let player = state.players[0];
    const bus = new ActionsBus();

    // Add Dark Matter Generator to the spaceship
    const darkMatterGenerator1 = new DarkMatterGenerator(1, 1, 1, 1);
    darkMatterGenerator1.x = 1;
    darkMatterGenerator1.y = 0;
    player.spaceship.modules.push(darkMatterGenerator1);

    const darkMatterGenerator2 = new DarkMatterGenerator(1, 1, 1, 1);
    darkMatterGenerator1.x = 2;
    darkMatterGenerator1.y = 0;
    player.spaceship.modules.push(darkMatterGenerator2);

    player.energy = 0; // Initial energy

    // Attach reducers to handle state updates
    attachReducers(bus, state);

    // Run the collectEnergy saga
    const runner = new SagaRunner(state, bus, collectEnergy);
    await runner.run();

    // test
    player = state.players[0];

    assert.equal(player.energy, 5);
});

test('collectEnergyWithSumGreaterThanCapacity', async () => {
    // Setup: Create a game state with one player, Command Module, and Dark Matter Generator
    const state: GameState = fakeGameState(1);
    let player = state.players[0];
    const bus = new ActionsBus();

    // Add Dark Matter Generator to the spaceship
    const darkMatterGenerator1 = new DarkMatterGenerator(1, 1, 1, 1);
    darkMatterGenerator1.x = 1;
    darkMatterGenerator1.y = 0;
    player.spaceship.modules.push(darkMatterGenerator1);

    player.energy = 2; // Initial energy

    // Attach reducers to handle state updates
    attachReducers(bus, state);

    // Run the collectEnergy saga
    const runner = new SagaRunner(state, bus, collectEnergy);
    await runner.run();

    // test
    // 2 (initial) + 3 (dark matter generator) + 1 (main module) > 5 (main module capacity)
    player = state.players[0];

    assert.equal(player.energy, 5);
});

test.run();