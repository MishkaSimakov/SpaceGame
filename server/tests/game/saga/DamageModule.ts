import {test} from "uvu";
import * as assert from "node:assert";
import {attachReducers, attachTerminalLogger, CountingRandomizer, fakeGameState} from "../Utils";
import ActionsBus from "@common/actions/ActionsBus";
import {discardCardsRequest} from "@common/actions/Main";
import {SagaRunner} from "../../../src/game/SagaRunner";
import {discardCards} from "../../../src/game/sagas/phases/DiscardCards";
import {damageModule} from "../../../src/game/sagas/components/DamageModule";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import SolarPanel from "@common/modules/SolarPanel";


test('simple', async () => {
    const state = fakeGameState(2);

    const attacker = state.players[0];
    const victim = state.players[1];
    const expectedHealth = SpaceshipGetters.getMainModule(victim.spaceship).totalHealth - 1;

    const randomizer = new CountingRandomizer();
    const bus = new ActionsBus();

    attachReducers(bus, state);

    const runner = new SagaRunner(
        state,
        bus,
        randomizer,
        damageModule(victim, attacker, SpaceshipGetters.getMainModule(victim.spaceship), 1, false)
    );

    await runner.run();

    // test
    assert.equal(SpaceshipGetters.getMainModule(state.players[1].spaceship).health, expectedHealth);
});

test.run();