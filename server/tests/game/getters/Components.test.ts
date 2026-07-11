import {expect, test} from "vitest";

import {ModuleType, Spaceship} from "@common/Types";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import {assertModulesEqual, fakeModule} from "../Utils";

test('emptyShip', () => {
    const spaceship: Spaceship = {modules: []};

    const components = SpaceshipGetters.getComponents(spaceship);
    expect(components.length).toEqual(0);
});

test('oneModule', () => {
    const mainModule = fakeModule(ModuleType.MainModule, {x: 0, y: 0});
    const spaceship: Spaceship = {modules: [mainModule]};

    const connected = SpaceshipGetters.getConnectedModules(spaceship, mainModule);
    expect(connected).toEqual([mainModule]);

    const components = SpaceshipGetters.getComponents(spaceship);
    expect(components.length).toEqual(1);
    expect(components[0].modules).toEqual([mainModule]);
});

test('connectedModules', () => {
    const mainModule = fakeModule(ModuleType.MainModule, {x: 0, y: 0});
    const solarPanel1 = fakeModule(ModuleType.SolarPanel, {
        x: -1,
        y: 0
    });
    const solarPanel2 = fakeModule(ModuleType.SolarPanel, {
        x: -2,
        y: 0
    });

    const spaceship: Spaceship = {modules: [mainModule, solarPanel1, solarPanel2]};

    const connected = SpaceshipGetters.getConnectedModules(spaceship, mainModule);
    assertModulesEqual(connected, [mainModule, solarPanel1, solarPanel2]);

    const components = SpaceshipGetters.getComponents(spaceship);
    expect(components.length).toEqual(1);
    assertModulesEqual(components[0].modules, [mainModule, solarPanel1, solarPanel2]);
});

test('tightGrid', () => {
    const modules = [];

    for (let x = 0; x < 5; ++x) {
        for (let y = 0; y < 5; ++y) {
            modules.push(fakeModule(ModuleType.SolarPanel, {
                x, y
            }));
        }
    }
    const spaceship: Spaceship = {modules};

    for (const module of modules) {
        const connected = SpaceshipGetters.getConnectedModules(spaceship, module);
        assertModulesEqual(connected, modules);
    }
});


test('twoComponents', () => {
    const first = fakeModule(ModuleType.SolarPanel, {x: 0, y: 0});
    const second = fakeModule(ModuleType.SolarPanel, {x: -2, y: 0});

    const spaceship: Spaceship = {modules: [first, second]};

    const firstConnected = SpaceshipGetters.getConnectedModules(spaceship, first);
    assertModulesEqual(firstConnected, [first]);

    const secondConnected = SpaceshipGetters.getConnectedModules(spaceship, second);
    assertModulesEqual(secondConnected, [second]);

    const components = SpaceshipGetters.getComponents(spaceship);
    expect(components.length).toEqual(2);
    assertModulesEqual(components[0].modules, [first]);
    assertModulesEqual(components[1].modules, [second]);
});
