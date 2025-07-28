import {test} from "uvu";
import * as assert from "node:assert";
import {reducers} from "../../../src/game/reducers/Main";
import {fakeGameState} from "../Utils";
import {ModuleTypes} from "@common/modules/Module";
import SolarPanel from "@common/modules/SolarPanel";
import QuantumProtector from "@common/modules/QuantumProtector";
import Vector2 from "@common/Vector2";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import Spaceship from "@common/Spaceship";

function initSpaceship(spaceship: Spaceship) {
    const mainModule = spaceship.modules[0];
    mainModule.connectors.left = 1;

    const firstModule = new SolarPanel(1, 1, 1, 1);
    firstModule.x = -1;
    firstModule.y = 0;

    const secondModule = new QuantumProtector(1, 1, 1, 1);
    secondModule.x = -2;
    secondModule.y = 0;

    spaceship.modules.push(firstModule, secondModule);
}

test('destructOneSpaceshipModule', async () => {
    const state = fakeGameState(2);
    const player = state.players[0];

    initSpaceship(player.spaceship);

    // destruct module
    reducers.destructSpaceshipModules(state, {
        player: player.id,
        positions: [new Vector2(-2, 0)],
        cardsDestiny: "hand"
    });

    // check state
    assert.equal(player.spaceship.modules.length, 2);
    assert.equal(SpaceshipGetters.getModulesByType(player.spaceship, ModuleTypes.QuantumProtector).length, 0);

    assert.equal(player.hand.length, 1);
    assert.equal(player.hand[0].type, ModuleTypes.QuantumProtector);
});

test('destructOneSpaceshipModuleWithChainDestruction', async () => {
    const state = fakeGameState(2);
    const player = state.players[0];

    initSpaceship(player.spaceship);

    // destruct module
    reducers.destructSpaceshipModules(state, {
        player: player.id,
        positions: [new Vector2(-1, 0)],
        cardsDestiny: "discard"
    });

    // check state
    assert.equal(player.spaceship.modules.length, 1);
    assert.equal(player.spaceship.modules[0].type, ModuleTypes.MainModule);

    assert.equal(state.discards.module.length, 2);
});

test.run();