import {test} from "uvu";
import * as assert from "uvu/assert";

import {attachReducers, fakeGameState} from "../Utils";
import ActionsBus from "@src/game/ActionsBus";
import {runSaga} from "@src/game/sagas/runner/RunSaga";
import {rebuildSpaceship} from "@src/game/sagas/phases/RebuildSpaceship";
import {StateGetters} from "@common/getters/State";
import {cheatChangeEnergy, rebuildSpaceshipResponse} from "@common/Actions";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {Channel} from "@src/game/sagas/runner/Channel";
import {GameInput} from "@src/game/sagas/runner/Environment";

test('cheatChangeCurrentPlayerEnergy', async () => {
    const state = fakeGameState(1);
    const player = state.players[0];
    const bus = new ActionsBus();
    const input: GameInput = new Channel();

    state.settings.isDebug = true; // Cheats are allowed
    player.energy = 0; // Initial energy
    player.spaceship.modules[0].capacity = 100; // change main module capacity

    // Attach reducers to handle state updates
    attachReducers(bus, state);

    // register listeners
    bus.on('rebuildSpaceshipRequest', (action) => {
        // issue some cheats
        const player = StateGetters.playerById(state, action.payload.player)!;
        input.put(cheatChangeEnergy(player.id, 10));

        // issue rebuildSpaceshipResponse
        input.put(rebuildSpaceshipResponse(SpaceshipGetters.mapForRebuildSpaceshipResponse(player.spaceship)));
    });

    await runSaga({state, output: bus, input}, rebuildSpaceship);

    assert.equal(StateGetters.playerById(state, player.id)!.energy, 10);
});

test.run();