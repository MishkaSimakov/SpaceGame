import {test} from "uvu";
import * as assert from "node:assert";

import {CardDestination, ModuleType, Spaceship} from "@common/Types";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import {reducers} from "../../../src/game/reducers/Main";
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

test('destructOneSpaceshipModule', async () => {
    const state = fakeGameState(2);
    const player = state.players[0];

    initSpaceship(player.spaceship);

    // destruct module
    reducers.destructSpaceshipModules!(state, {
        player: player.id,
        positions: [{x: -2, y: 0}],
        destructedCardsDestiny: CardDestination.hand,
        detachedCardsDestiny: CardDestination.hand
    });

    // check state
    assert.equal(player.spaceship.modules.length, 2);
    assert.equal(SpaceshipGetters.getModulesByType(player.spaceship, ModuleType.QuantumProtector).length, 0);

    assert.equal(player.hand.length, 1);
    assert.ok(player.hand[0].cardType === "module");
    assert.equal(player.hand[0].module.type, ModuleType.QuantumProtector);
});

test('destructOneSpaceshipModuleWithChainDestruction', async () => {
    const state = fakeGameState(2);
    const player = state.players[0];

    initSpaceship(player.spaceship);

    // destruct module
    reducers.destructSpaceshipModules!(state, {
        player: player.id,
        positions: [{x: -1, y: 0}],
        destructedCardsDestiny: CardDestination.discard,
        detachedCardsDestiny: CardDestination.discard
    });

    // check state
    assert.equal(player.spaceship.modules.length, 1);
    assert.equal(player.spaceship.modules[0].type, ModuleType.MainModule);

    assert.equal(state.discards.module.length, 2);
});

test.run();