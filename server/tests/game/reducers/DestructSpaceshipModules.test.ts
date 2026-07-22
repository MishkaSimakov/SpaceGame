import * as assert from "node:assert";

import {expect, test} from "vitest";

import {CardDestination, ModuleType, Spaceship} from "@common/Types";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import {reducers} from "@src/game/reducers/Main";
import {fakeGameState, fakeModule} from "../Utils";

function initSpaceship(spaceship: Spaceship) {
    const mainModule = spaceship.modules[0];
    mainModule.connectors.left = 1;

    const firstModule = fakeModule(ModuleType.SolarPanel, {
        x: -1,
        y: 0
    });

    const secondModule = fakeModule(ModuleType.QuantumProtector, {
        x: -2,
        y: 0
    });

    spaceship.modules.push(firstModule, secondModule);
}

test('destructOneSpaceshipModule', () => {
    const state = fakeGameState(2);
    const player = state.players[0];

    initSpaceship(player.spaceship);

    // destruct module
    const destructSpaceshipModules = reducers.destructSpaceshipModules;
    assert.ok(destructSpaceshipModules !== undefined);
    destructSpaceshipModules(state, {
        player: player.id,
        positions: [{x: -2, y: 0}],
        destructedCardsDestiny: CardDestination.hand,
        detachedCardsDestiny: CardDestination.hand
    });

    // check state
    expect(player.spaceship.modules.length).toEqual(2);
    expect(SpaceshipGetters.getModulesByType(player.spaceship, ModuleType.QuantumProtector).length).toEqual(0);

    expect(player.hand.length).toEqual(1);

    const returned = player.hand[0];
    if (returned.cardType !== "module") {
        expect.unreachable("destructed module must return to the hand as a module card");
    }
    expect(returned.module.type).toEqual(ModuleType.QuantumProtector);
});

test('destructOneSpaceshipModuleWithChainDestruction', () => {
    const state = fakeGameState(2);
    const player = state.players[0];

    initSpaceship(player.spaceship);

    // destruct module
    const destructSpaceshipModules = reducers.destructSpaceshipModules;
    assert.ok(destructSpaceshipModules !== undefined);
    destructSpaceshipModules(state, {
        player: player.id,
        positions: [{x: -1, y: 0}],
        destructedCardsDestiny: CardDestination.discard,
        detachedCardsDestiny: CardDestination.discard
    });

    // check state
    expect(player.spaceship.modules.length).toEqual(1);
    expect(player.spaceship.modules[0].type).toEqual(ModuleType.MainModule);

    expect(state.discards.module.length).toEqual(2);
});
