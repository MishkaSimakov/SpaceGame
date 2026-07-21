import * as assert from "node:assert";

import {expect, test} from "vitest";

import {SpaceshipGetters} from "@common/getters/Spaceship";
import {ModuleType} from "@common/Types";

import {damageModule} from "@src/game/sagas/components/DamageModule";
import {runSaga} from "@src/game/sagas/runner/RunSaga";

import {attachReducers, fakeGameState, fakeModule, TestBus} from "../Utils";


test('simple', async () => {
    const state = fakeGameState(2);

    const attacker = state.players[0];
    const victim = state.players[1];
    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship);
    assert.ok(mainModule !== undefined);
    const expectedHealth = mainModule.totalHealth - 1;

    const bus = new TestBus(state);

    attachReducers(bus, state);

    await runSaga(
        bus.env,
        damageModule, victim, {x: 0, y: 0}, 1, {type: "Player", attacker}
    );

    // test
    const damagedMain = SpaceshipGetters.getMainModule(state.players[1].spaceship);
    assert.ok(damagedMain !== undefined);
    expect(damagedMain.health).toEqual(expectedHealth);
});

test('damageModuleReducesEnergyWhenCapacityDecreases', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new TestBus(state);

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship);
    assert.ok(mainModule !== undefined);
    mainModule.capacity = 25;
    mainModule.health = 10;
    mainModule.connectors = {top: 0, right: 1, bottom: 0, left: 0};

    const battery = fakeModule(ModuleType.Battery, {
        x: 1,
        y: 0,
        health: 2,
        capacity: 10
    });
    victim.spaceship.modules.push(battery);

    victim.energy = 30;

    attachReducers(bus, state);

    // Run
    await runSaga(
        bus.env,
        damageModule, victim, {x: 1, y: 0}, battery.health, {type: 'Player', attacker}
    );

    // Test
    attacker = state.players[0];
    victim = state.players[1];
    expect(victim.spaceship.modules.length).toEqual(1);
    expect(SpaceshipGetters.getTotalCapacity(victim.spaceship)).toEqual(25);
    expect(victim.energy).toEqual(25);
    expect(attacker.hand.length).toEqual(1);

    const looted = attacker.hand[0];
    if (looted.cardType !== "module") {
        expect.unreachable("destroyed module must go to the attacker's hand as a module card");
    }
    expect(looted.module.type).toEqual(ModuleType.Battery);
    expect(victim.hand.length).toEqual(0);
});

test('damageModuleNoEnergyAdjustmentWhenWithinCapacity', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new TestBus(state);

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship);
    assert.ok(mainModule !== undefined);
    mainModule.capacity = 25;
    mainModule.health = 10;
    mainModule.connectors = {top: 0, right: 1, bottom: 0, left: 0};

    const battery = fakeModule(ModuleType.Battery, {
        x: 1,
        y: 0,
        capacity: 10,
        health: 2
    });
    victim.spaceship.modules.push(battery);

    victim.energy = 20;

    attachReducers(bus, state);

    // Run
    await runSaga(
        bus.env,
        damageModule, victim, {x: 1, y: 0}, battery.health, {type: 'Player', attacker}
    );

    // Test
    attacker = state.players[0];
    victim = state.players[1];
    expect(victim.spaceship.modules.length).toEqual(1);
    expect(SpaceshipGetters.getTotalCapacity(victim.spaceship)).toEqual(25);
    expect(victim.energy).toEqual(20);
    expect(attacker.hand.length).toEqual(1);

    const looted = attacker.hand[0];
    if (looted.cardType !== "module") {
        expect.unreachable("destroyed module must go to the attacker's hand as a module card");
    }
    expect(looted.module.type).toEqual(ModuleType.Battery);
    expect(victim.hand.length).toEqual(0);
});

test('damageModuleNoDestructionNoEnergyAdjustment', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new TestBus(state);

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship);
    assert.ok(mainModule !== undefined);
    mainModule.capacity = 25;
    mainModule.health = 10;
    mainModule.connectors = {top: 0, right: 1, bottom: 0, left: 0};

    const battery = fakeModule(ModuleType.Battery, {
        x: 1,
        y: 0,
        capacity: 10,
        health: 2
    });
    victim.spaceship.modules.push(battery);

    victim.energy = 30;

    attachReducers(bus, state);

    // Run
    await runSaga(
        bus.env,
        damageModule, victim, {x: 1, y: 0}, 1, {type: 'Player', attacker}
    );

    // Test
    attacker = state.players[0];
    victim = state.players[1];
    expect(victim.spaceship.modules.length).toEqual(2);
    expect(SpaceshipGetters.getTotalCapacity(victim.spaceship)).toEqual(35);
    expect(victim.energy).toEqual(30);
    expect(attacker.hand.length).toEqual(0);
    expect(victim.hand.length).toEqual(0);
    const damaged = SpaceshipGetters.getModuleByPosition(victim.spaceship, {x: 1, y: 0});
    assert.ok(damaged !== undefined);
    expect(damaged.health).toEqual(1);
});

test('damageFromNuclearReactor', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new TestBus(state);

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship);
    assert.ok(mainModule !== undefined);
    mainModule.connectors = {top: 1, right: 1, bottom: 1, left: 1};

    const reactor = fakeModule(ModuleType.NuclearReactor, {
        x: 1,
        y: 0
    });
    victim.spaceship.modules.push(reactor);

    attachReducers(bus, state);

    // Run
    await runSaga(
        bus.env,
        damageModule, victim, {x: 1, y: 0}, reactor.health, {type: 'Player', attacker}
    );

    // Test
    attacker = state.players[0];
    victim = state.players[1];

    expect(victim.spaceship.modules.length).toEqual(1);
    expect(victim.spaceship.modules[0].health).toEqual(victim.spaceship.modules[0].totalHealth - 1);
});


test('damageFromNuclearReactorChain', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new TestBus(state);

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship);
    assert.ok(mainModule !== undefined);
    mainModule.connectors = {top: 1, right: 1, bottom: 1, left: 1};

    const firstReactor = fakeModule(ModuleType.NuclearReactor, {
        x: 1,
        y: 0,
        health: 1
    });
    victim.spaceship.modules.push(firstReactor);

    const secondReactor = fakeModule(ModuleType.NuclearReactor, {
        x: 2,
        y: 0,
        health: 1
    });
    victim.spaceship.modules.push(secondReactor);

    const thirdReactor = fakeModule(ModuleType.NuclearReactor, {
        x: 3,
        y: 0,
        health: 1
    });
    victim.spaceship.modules.push(thirdReactor);

    attachReducers(bus, state);

    // Run
    await runSaga(
        bus.env,
        damageModule, victim, {x: 3, y: 0}, 1, {type: 'Player', attacker}
    );

    // Test
    attacker = state.players[0];
    victim = state.players[1];

    expect(victim.spaceship.modules.length).toEqual(1);
    expect(victim.spaceship.modules[0].health).toEqual(victim.spaceship.modules[0].totalHealth - 1);

    // 1 nuclear reactor in attacker's hand + 2 in discards
    expect(state.discards.module.length).toEqual(2);
    expect(attacker.hand.length).toEqual(1);
});


test('healthIsRestoredWhenGoesToDiscards', async () => {
    // Setup
    const state = fakeGameState(2);

    let victim = state.players[1];
    const bus = new TestBus(state);

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship);
    assert.ok(mainModule !== undefined);
    mainModule.connectors = {top: 1, right: 1, bottom: 1, left: 1};

    const protector = fakeModule(ModuleType.QuantumProtector, {
        x: 1,
        y: 0,
        health: 1
    });
    victim.spaceship.modules.push(protector);

    attachReducers(bus, state);

    // Run
    await runSaga(
        bus.env,
        damageModule, victim, {x: 1, y: 0}, 1, {type: 'EventCard'}
    );

    // Test
    victim = state.players[1];

    expect(victim.spaceship.modules.length).toEqual(1);

    expect(state.discards.module.length).toEqual(1);
    const discarded = state.discards.module[0];

    expect(discarded.id).toEqual(protector.id);
    expect(discarded.health).toEqual(discarded.totalHealth);
});