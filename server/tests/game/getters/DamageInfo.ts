import {test} from "uvu";
import * as assert from "node:assert";

import Spaceship from "@common/Spaceship";
import {MainModule, MainModuleType} from "@common/modules/MainModule";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import Vector2 from "@common/Vector2";
import SmallQuantumProtector from "@common/modules/SmallQuantumProtector";
import SolarPanel from "@common/modules/SolarPanel";

const fakeMainModule = () => {
    const module = new MainModule(1, MainModuleType.DrawAnotherEventCard, {
        top: 1,
        right: 1,
        bottom: 1,
        left: 1
    });

    module.x = 0;
    module.y = 0;

    return module;
}

test('simple', () => {
    const spaceship = new Spaceship();
    const mainModule = fakeMainModule();
    spaceship.modules.push(mainModule);

    const info = SpaceshipGetters.damageInfo(spaceship, mainModule, 1);

    assert.equal(info.shouldDeactivateProtector, false);
    assert.equal(info.destroyed.length, 0);

    assert.equal(info.damaged.length, 1);
    assert.deepEqual(info.damaged[0].position, new Vector2(0, 0));
    assert.equal(info.damaged[0].damage, 1);
});

test('simpleProtector', () => {
    const spaceship = new Spaceship();
    const mainModule = fakeMainModule();
    spaceship.modules.push(mainModule);

    const protector = new SmallQuantumProtector(1, 1, 1, 1);
    protector.x = -1;
    protector.y = 0;
    spaceship.modules.push(protector);

    spaceship.activatedProtector = protector;

    const info = SpaceshipGetters.damageInfo(spaceship, mainModule, 1);

    assert.equal(info.shouldDeactivateProtector, false);
    assert.equal(info.destroyed.length, 0);

    assert.equal(info.damaged.length, 1);
    assert.deepEqual(info.damaged[0].position, new Vector2(-1, 0));
    assert.equal(info.damaged[0].damage, 1);
});

test('destroyedProtector', () => {
    const spaceship = new Spaceship();
    const mainModule = fakeMainModule();
    spaceship.modules.push(mainModule);

    const protector = new SmallQuantumProtector(1, 1, 1, 1);
    protector.x = -1;
    protector.y = 0;
    spaceship.modules.push(protector);

    spaceship.activatedProtector = protector;

    const info = SpaceshipGetters.damageInfo(spaceship, mainModule, protector.health + 5);

    assert.equal(info.shouldDeactivateProtector, true);

    assert.equal(info.destroyed.length, 1);
    assert.deepEqual(info.destroyed[0].position, new Vector2(-1, 0));
    assert.equal(info.destroyed[0].byNuclearReactor, false);

    assert.equal(info.damaged.length, 1);
    assert.deepEqual(info.damaged[0].position, new Vector2(0, 0));
    assert.equal(info.damaged[0].damage, 5);
});

test('destroyedProtectorAndModule', () => {
    const spaceship = new Spaceship();
    const mainModule = fakeMainModule();
    spaceship.modules.push(mainModule);

    const protector = new SmallQuantumProtector(1, 1, 1, 1);
    protector.x = -1;
    protector.y = 0;
    spaceship.modules.push(protector);

    spaceship.activatedProtector = protector;

    const module = new SolarPanel(1, 1, 1, 1);
    module.x = -2;
    module.y = 0;
    spaceship.modules.push(module);

    const info = SpaceshipGetters.damageInfo(spaceship, module, protector.health + module.health + 1);

    assert.equal(info.shouldDeactivateProtector, true);

    assert.equal(info.destroyed.length, 2);
    assert.deepEqual(
        new Set(info.destroyed.map(d => d.position)),
        new Set([new Vector2(-1, 0), new Vector2(-2, 0)])
    );
    assert.ok(!info.destroyed.some(d => d.byNuclearReactor));

    assert.equal(info.damaged.length, 0);
});

test.run();