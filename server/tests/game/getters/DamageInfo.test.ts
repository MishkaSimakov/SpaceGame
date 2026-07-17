import {expect, test} from "vitest";

import {ModuleType, Spaceship} from "@common/Types";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import {fakeModule} from "../Utils";

test('simple', () => {
    const spaceship: Spaceship = {modules: []};
    const mainModule = fakeModule(ModuleType.MainModule, {x: 0, y: 0});
    spaceship.modules.push(mainModule);

    const info = SpaceshipGetters.damageInfo(spaceship, mainModule, 1);

    expect(info.shouldDeactivateProtector).toEqual(false);
    expect(info.destroyed.length).toEqual(0);

    expect(info.damaged.length).toEqual(1);
    expect(info.damaged[0].position).toEqual({x: 0, y: 0});
    expect(info.damaged[0].damage).toEqual(1);
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

    expect(info.shouldDeactivateProtector).toEqual(false);
    expect(info.destroyed.length).toEqual(0);

    expect(info.damaged.length).toEqual(1);
    expect(info.damaged[0].position).toEqual({x: -1, y: 0});
    expect(info.damaged[0].damage).toEqual(1);
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

    expect(info.shouldDeactivateProtector).toEqual(true);

    expect(info.destroyed.length).toEqual(1);
    expect(info.destroyed[0].position).toEqual({x: -1, y: 0});
    expect(info.destroyed[0].byNuclearReactor).toEqual(false);

    expect(info.damaged.length).toEqual(1);
    expect(info.damaged[0].position).toEqual({x: 0, y: 0});
    expect(info.damaged[0].damage).toEqual(5);
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

    expect(info.shouldDeactivateProtector).toEqual(true);

    expect(info.destroyed.length).toEqual(2);
    expect(new Set(info.destroyed.map(d => d.position)))
        .toEqual(new Set([{x: -1, y: 0}, {x: -2, y: 0}]));
    expect(info.destroyed.some(d => d.byNuclearReactor)).toBeFalsy();

    expect(info.damaged.length).toEqual(0);
});
