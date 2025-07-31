import {test} from "uvu";
import * as assert from "node:assert";
import {attachReducers, attachTerminalLogger, fakeGameState} from "../Utils";
import ActionsBus from "@common/actions/ActionsBus";
import {discardCardsRequest} from "@common/actions/Main";
import {SagaRunner} from "../../../src/game/SagaRunner";
import {discardCards} from "../../../src/game/sagas/phases/DiscardCards";
import {damageModule} from "../../../src/game/sagas/components/DamageModule";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import SolarPanel from "@common/modules/SolarPanel";
import Vector2 from "@common/Vector2";


test('simple', async () => {
    const state = fakeGameState(2);

    const attacker = state.players[0];
    const victim = state.players[1];
    const expectedHealth = SpaceshipGetters.getMainModule(victim.spaceship).totalHealth - 1;

    const bus = new ActionsBus();

    attachReducers(bus, state);

    const runner = new SagaRunner(
        state,
        bus,
        damageModule(victim, new Vector2(0, 0), 1, {type: "Player", attacker})
    );

    await runner.run();

    // test
    assert.equal(SpaceshipGetters.getMainModule(state.players[1].spaceship).health, expectedHealth);
});

test.run();