import {test} from "uvu";
import * as assert from "node:assert";

import {SpaceshipGetters} from "@common/getters/Spaceship";
import Vector2 from "@common/Vector2";
import Battery from "@common/modules/Battery";
import {ModuleType} from "@common/modules/ModuleCard";

import {attachReducers, fakeGameState} from "../Utils";
import ActionsBus from "../../../src/game/ActionsBus";
import {SagaRunner} from "../../../src/game/sagas/SagaRunner";
import {damageModule} from "../../../src/game/sagas/components/DamageModule";
import NuclearReactor from "@common/modules/NuclearReactor";
import SolarPanel from "@common/modules/SolarPanel";
import QuantumProtector from "@common/modules/QuantumProtector";


test('simple', async () => {
    const state = fakeGameState(2);

    const attacker = state.players[0];
    const victim = state.players[1];
    const expectedHealth = SpaceshipGetters.getMainModule(victim.spaceship)!.totalHealth - 1;

    const bus = new ActionsBus();

    attachReducers(bus, state);

    const runner = new SagaRunner(
        state,
        bus,
        damageModule, victim, new Vector2(0, 0), 1, {type: "Player", attacker}
    );

    await runner.run();

    // test
    assert.equal(SpaceshipGetters.getMainModule(state.players[1].spaceship)!.health, expectedHealth);
});

test('damageModuleReducesEnergyWhenCapacityDecreases', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new ActionsBus();

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship)!;
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
        damageModule, victim, new Vector2(1, 0), battery.health, {type: 'Player', attacker}
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

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship)!;
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
        damageModule, victim, new Vector2(1, 0), battery.health, {type: 'Player', attacker}
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

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship)!;
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
        damageModule, victim, new Vector2(1, 0), 1, {type: 'Player', attacker}
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

test('damageFromNuclearReactor', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new ActionsBus();

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship)!;
    mainModule.connectors = {top: 1, right: 1, bottom: 1, left: 1};

    const reactor = new NuclearReactor(1, 1, 1, 1);
    reactor.x = 1;
    reactor.y = 0;
    victim.spaceship.modules.push(reactor);

    attachReducers(bus, state);

    // Run
    const runner = new SagaRunner(
        state,
        bus,
        damageModule, victim, new Vector2(1, 0), reactor.health, {type: 'Player', attacker}
    );
    await runner.run();

    // Test
    attacker = state.players[0];
    victim = state.players[1];

    assert.equal(victim.spaceship.modules.length, 1);
    assert.equal(victim.spaceship.modules[0].health, victim.spaceship.modules[0].totalHealth - 1);
});


test('damageFromNuclearReactorChain', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new ActionsBus();

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship)!;
    mainModule.connectors = {top: 1, right: 1, bottom: 1, left: 1};

    const firstReactor = new NuclearReactor(1, 1, 1, 1);
    firstReactor.x = 1;
    firstReactor.y = 0;
    firstReactor.health = 1;
    victim.spaceship.modules.push(firstReactor);

    const secondReactor = new NuclearReactor(1, 1, 1, 1);
    secondReactor.x = 2;
    secondReactor.y = 0;
    secondReactor.health = 1;
    victim.spaceship.modules.push(secondReactor);

    const thirdReactor = new NuclearReactor(1, 1, 1, 1);
    thirdReactor.x = 3;
    thirdReactor.y = 0;
    thirdReactor.health = 1;
    victim.spaceship.modules.push(thirdReactor);

    attachReducers(bus, state);

    // Run
    const runner = new SagaRunner(
        state,
        bus,
        damageModule, victim, new Vector2(3, 0), 1, {type: 'Player', attacker}
    );
    await runner.run();

    // Test
    attacker = state.players[0];
    victim = state.players[1];

    assert.equal(victim.spaceship.modules.length, 1);
    assert.equal(victim.spaceship.modules[0].health, victim.spaceship.modules[0].totalHealth - 1);

    // 1 nuclear reactor in attacker's hand + 2 in discards
    assert.equal(state.discards.module.length, 2);
    assert.equal(attacker.hand.length, 1);
});


test('healthIsRestoredWhenGoesToDiscards', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new ActionsBus();

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship)!;
    mainModule.connectors = {top: 1, right: 1, bottom: 1, left: 1};

    const protector = new QuantumProtector(1, 1, 1, 1);
    protector.x = 1;
    protector.y = 0;
    protector.health = 1;
    victim.spaceship.modules.push(protector);

    attachReducers(bus, state);

    // Run
    const runner = new SagaRunner(
        state,
        bus,
        damageModule, victim, new Vector2(1, 0), 1, {type: 'EventCard'}
    );
    await runner.run();

    // Test
    attacker = state.players[0];
    victim = state.players[1];

    assert.equal(victim.spaceship.modules.length, 1);

    assert.equal(state.discards.module.length, 1);
    const discarded = state.discards.module[0];

    assert.equal(discarded.id, protector.id);
    assert.equal(discarded.health, discarded.totalHealth);
});


test.run();