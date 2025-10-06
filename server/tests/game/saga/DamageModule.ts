import {test} from "uvu";
import * as assert from "uvu/assert";

import {SpaceshipGetters} from "@common/getters/Spaceship";
import {ModuleType} from "@common/Types";

import {attachReducers, fakeGameState, fakeModule} from "../Utils";
import ActionsBus from "../../../src/game/ActionsBus";
import {damageModule} from "@src/game/sagas/components/DamageModule";
import {runSaga} from "@src/game/sagas/runner/RunSaga";
import {GameInput} from "@src/game/sagas/runner/Environment";
import {Channel} from "@src/game/sagas/runner/Channel";


test('simple', async () => {
    const state = fakeGameState(2);
    const input: GameInput = new Channel();

    const attacker = state.players[0];
    const victim = state.players[1];
    const expectedHealth = SpaceshipGetters.getMainModule(victim.spaceship)!.totalHealth - 1;

    const bus = new ActionsBus();

    attachReducers(bus, state);

    await runSaga(
        {state, output: bus, input},
        damageModule, victim, {x: 0, y: 0}, 1, {type: "Player", attacker}
    );

    // test
    assert.equal(SpaceshipGetters.getMainModule(state.players[1].spaceship)!.health, expectedHealth);
});

test('damageModuleReducesEnergyWhenCapacityDecreases', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship)!;
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
        {state, output: bus, input},
        damageModule, victim, {x: 1, y: 0}, battery.health, {type: 'Player', attacker}
    );

    // Test
    attacker = state.players[0];
    victim = state.players[1];
    assert.equal(victim.spaceship.modules.length, 1);
    assert.equal(SpaceshipGetters.getTotalCapacity(victim.spaceship), 25);
    assert.equal(victim.energy, 25);
    assert.equal(attacker.hand.length, 1);
    assert.ok(attacker.hand[0].cardType === "module");
    assert.equal(attacker.hand[0].module.type, ModuleType.Battery);
    assert.equal(victim.hand.length, 0);
});

test('damageModuleNoEnergyAdjustmentWhenWithinCapacity', async () => {
    // Setup
    const state = fakeGameState(2);
    const input: GameInput = new Channel();

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new ActionsBus();

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship)!;
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
        {state, output: bus, input},
        damageModule, victim, {x: 1, y: 0}, battery.health, {type: 'Player', attacker}
    );

    // Test
    attacker = state.players[0];
    victim = state.players[1];
    assert.equal(victim.spaceship.modules.length, 1);
    assert.equal(SpaceshipGetters.getTotalCapacity(victim.spaceship), 25);
    assert.equal(victim.energy, 20);
    assert.equal(attacker.hand.length, 1);
    assert.ok(attacker.hand[0].cardType === "module");
    assert.equal(attacker.hand[0].module.type, ModuleType.Battery);
    assert.equal(victim.hand.length, 0);
});

test('damageModuleNoDestructionNoEnergyAdjustment', async () => {
    // Setup
    const state = fakeGameState(2);
    const input: GameInput = new Channel();

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new ActionsBus();

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship)!;
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
        {state, output: bus, input},
        damageModule, victim, {x: 1, y: 0}, 1, {type: 'Player', attacker}
    );

    // Test
    attacker = state.players[0];
    victim = state.players[1];
    assert.equal(victim.spaceship.modules.length, 2);
    assert.equal(SpaceshipGetters.getTotalCapacity(victim.spaceship), 35);
    assert.equal(victim.energy, 30);
    assert.equal(attacker.hand.length, 0);
    assert.equal(victim.hand.length, 0);
    assert.equal(SpaceshipGetters.getModuleByPosition(victim.spaceship, {x: 1, y: 0})!.health, 1);
});

test('damageFromNuclearReactor', async () => {
    // Setup
    const state = fakeGameState(2);

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship)!;
    mainModule.connectors = {top: 1, right: 1, bottom: 1, left: 1};

    const reactor = fakeModule(ModuleType.NuclearReactor, {
        x: 1,
        y: 0
    });
    victim.spaceship.modules.push(reactor);

    attachReducers(bus, state);

    // Run
    await runSaga(
        {state, output: bus, input},
        damageModule, victim, {x: 1, y: 0}, reactor.health, {type: 'Player', attacker}
    );

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
    const input: GameInput = new Channel();

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship)!;
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
        {state, output: bus, input},
        damageModule, victim, {x: 3, y: 0}, 1, {type: 'Player', attacker}
    );

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
    const input: GameInput = new Channel();

    let attacker = state.players[0];
    let victim = state.players[1];
    const bus = new ActionsBus();

    const mainModule = SpaceshipGetters.getMainModule(victim.spaceship)!;
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
        {state, output: bus, input},
        damageModule, victim, {x: 1, y: 0}, 1, {type: 'EventCard'}
    );

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