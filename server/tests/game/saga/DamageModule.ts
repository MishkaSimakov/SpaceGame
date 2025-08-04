import {test} from "uvu";
import * as assert from "node:assert";
import {attachReducers, attachTerminalLogger, fakeGameState} from "../Utils";
import ActionsBus from "@common/actions/ActionsBus";
import {discardCardsRequest} from "@common/actions/Main";
import {SagaRunner} from "../../../src/game/SagaRunner";
import {discardCards} from "../../../src/game/sagas/phases/DiscardCards";
import {damageModule} from "../../../src/game/sagas/components/DamageModule";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import SolarPanel from "@common/modules/SolarPanel";
import Vector2 from "@common/Vector2";
import Battery from "@common/modules/Battery";
import {ModuleType} from "@common/modules/Module";


test('simple', async () => {
    const state = fakeGameState(2);

    const attacker = state.players[0];
    const victim = state.players[1];
    const expectedHealth = SpaceshipGetters.getMainModule(victim.spaceship).totalHealth - 1;

    const bus = new ActionsBus();

    attachReducers(bus, state);

    const runner = new SagaRunner(
        state,
        bus,
        damageModule(victim, new Vector2(0, 0), 1, {type: "Player", attacker})
    );

    await runner.run();

    // test
    assert.equal(SpaceshipGetters.getMainModule(state.players[1].spaceship).health, expectedHealth);
});

test('damageModuleReducesEnergyWhenCapacityDecreases', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new ActionsBus();

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship);
    mainModule.capacity = 25;
    mainModule.health = 10;
    mainModule.connectors = {top: 0, right: 1, bottom: 0, left: 0};

    const battery = new Battery(0, 1, 0, 1);
    battery.x = 1;
    battery.y = 0;
    battery.capacity = 10;
    battery.health = 2;
    victim.spaceship.modules.push(battery);

    victim.energy = 30;

    attachReducers(bus, state);

    // Run
    const runner = new SagaRunner(
        state,
        bus,
        damageModule(victim, new Vector2(1, 0), battery.health, {type: 'Player', attacker})
    );
    await runner.run();

    // Test
    attacker = state.players[0];
    victim = state.players[1];
    assert.equal(victim.spaceship.modules.length, 1);
    assert.equal(SpaceshipGetters.getTotalCapacity(victim.spaceship), 25);
    assert.equal(victim.energy, 25);
    assert.equal(attacker.hand.length, 1);
    assert.equal(attacker.hand[0].type, ModuleType.Battery);
    assert.equal(victim.hand.length, 0);
});

test('damageModuleNoEnergyAdjustmentWhenWithinCapacity', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new ActionsBus();

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship);
    mainModule.capacity = 25;
    mainModule.health = 10;
    mainModule.connectors = {top: 0, right: 1, bottom: 0, left: 0};

    const battery = new Battery(0, 1, 0, 1);
    battery.x = 1;
    battery.y = 0;
    battery.capacity = 10;
    battery.health = 2;
    victim.spaceship.modules.push(battery);

    victim.energy = 20;

    attachReducers(bus, state);

    // Run
    const runner = new SagaRunner(
        state,
        bus,
        damageModule(victim, new Vector2(1, 0), battery.health, {type: 'Player', attacker})
    );
    await runner.run();

    // Test
    attacker = state.players[0];
    victim = state.players[1];
    assert.equal(victim.spaceship.modules.length, 1);
    assert.equal(SpaceshipGetters.getTotalCapacity(victim.spaceship), 25);
    assert.equal(victim.energy, 20);
    assert.equal(attacker.hand.length, 1);
    assert.equal(attacker.hand[0].type, ModuleType.Battery);
    assert.equal(victim.hand.length, 0);
});

test('damageModuleNoDestructionNoEnergyAdjustment', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new ActionsBus();

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship);
    mainModule.capacity = 25;
    mainModule.health = 10;
    mainModule.connectors = {top: 0, right: 1, bottom: 0, left: 0};

    const battery = new Battery(0, 1, 0, 1);
    battery.x = 1;
    battery.y = 0;
    battery.capacity = 10;
    battery.health = 2;
    victim.spaceship.modules.push(battery);

    victim.energy = 30;

    attachReducers(bus, state);

    // Run
    const runner = new SagaRunner(
        state,
        bus,
        damageModule(victim, new Vector2(1, 0), 1, {type: 'Player', attacker})
    );
    await runner.run();

    // Test
    attacker = state.players[0];
    victim = state.players[1];
    assert.equal(victim.spaceship.modules.length, 2);
    assert.equal(SpaceshipGetters.getTotalCapacity(victim.spaceship), 35);
    assert.equal(victim.energy, 30);
    assert.equal(attacker.hand.length, 0);
    assert.equal(victim.hand.length, 0);
    assert.equal(SpaceshipGetters.getModuleByPosition(victim.spaceship, new Vector2(1, 0)).health, 1);
});

test.run();