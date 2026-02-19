import {test} from "uvu";
import * as assert from "uvu/assert";

import {ModuleType, Spaceship} from "@common/Types";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import {fakeModule} from "../Utils";

test('simple', () => {
    const spaceship: Spaceship = {modules: []};
    const mainModule = fakeModule(ModuleType.MainModule, {x: 0, y: 0});
    spaceship.modules.push(mainModule);

    const info = SpaceshipGetters.damageInfo(spaceship, mainModule, 1);

    assert.equal(info.shouldDeactivateProtector, false);
    assert.equal(info.destroyed.length, 0);

    assert.equal(info.damaged.length, 1);
    assert.equal(info.damaged[0].position, {x: 0, y: 0});
    assert.equal(info.damaged[0].damage, 1);
});

test('simpleProtector', () => {
    const spaceship: Spaceship = {modules: []};
    const mainModule = fakeModule(ModuleType.MainModule, {x: 0, y: 0});
    spaceship.modules.push(mainModule);

    const protector = fakeModule(ModuleType.SmallQuantumProtector, {
        x: -1,
        y: 0
    });
    spaceship.modules.push(protector);

    spaceship.activatedProtector = protector;

    const info = SpaceshipGetters.damageInfo(spaceship, mainModule, 1);

    assert.equal(info.shouldDeactivateProtector, false);
    assert.equal(info.destroyed.length, 0);

    assert.equal(info.damaged.length, 1);
    assert.equal(info.damaged[0].position, {x: -1, y: 0});
    assert.equal(info.damaged[0].damage, 1);
});

test('destroyedProtector', () => {
    const spaceship: Spaceship = {modules: []};
    const mainModule = fakeModule(ModuleType.MainModule, {x: 0, y: 0});
    spaceship.modules.push(mainModule);

    const protector = fakeModule(ModuleType.SmallQuantumProtector, {
        x: -1,
        y: 0
    });
    spaceship.modules.push(protector);

    spaceship.activatedProtector = protector;

    const info = SpaceshipGetters.damageInfo(spaceship, mainModule, protector.health + 5);

    assert.equal(info.shouldDeactivateProtector, true);

    assert.equal(info.destroyed.length, 1);
    assert.equal(info.destroyed[0].position, {x: -1, y: 0});
    assert.equal(info.destroyed[0].byNuclearReactor, false);

    assert.equal(info.damaged.length, 1);
    assert.equal(info.damaged[0].position, {x: 0, y: 0});
    assert.equal(info.damaged[0].damage, 5);
});

test('destroyedProtectorAndModule', () => {
    const spaceship: Spaceship = {modules: []};
    const mainModule = fakeModule(ModuleType.MainModule, {x: 0, y: 0});
    spaceship.modules.push(mainModule);

    const protector = fakeModule(ModuleType.SmallQuantumProtector, {
        x: -1,
        y: 0
    });
    spaceship.modules.push(protector);

    spaceship.activatedProtector = protector;

    const module = fakeModule(ModuleType.SolarPanel, {
        x: -2,
        y: 0
    });
    spaceship.modules.push(module);

    const info = SpaceshipGetters.damageInfo(spaceship, module, protector.health + module.health + 1);

    assert.equal(info.shouldDeactivateProtector, true);

    assert.equal(info.destroyed.length, 2);
    assert.equal(
        new Set(info.destroyed.map(d => d.position)),
        new Set([{x: -1, y: 0}, {x: -2, y: 0}])
    );
    assert.ok(!info.destroyed.some(d => d.byNuclearReactor));

    assert.equal(info.damaged.length, 0);
});

test.run();