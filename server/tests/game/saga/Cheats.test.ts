import {expect, test} from "vitest";

import {runSaga} from "@src/game/sagas/runner/RunSaga";
import {rebuildSpaceship} from "@src/game/sagas/phases/RebuildSpaceship";
import {StateGetters} from "@common/getters/State";
import {cheatChangeEnergy, rebuildSpaceshipResponse} from "@common/Actions";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import {attachReducers, fakeGameState, TestBus} from "../Utils";

test('cheatChangeCurrentPlayerEnergy', async () => {
    const state = fakeGameState(1);
    const player = state.players[0];
    const bus = new TestBus(state);

    state.settings.isDebug = true; // Cheats are allowed
    player.energy = 0; // Initial energy
    player.spaceship.modules[0].capacity = 100; // change main module capacity

    // Attach reducers to handle state updates
    attachReducers(bus, state);

    // register listeners
    bus.on('rebuildSpaceshipRequest', (action) => {
        // issue some cheats
        const player = StateGetters.playerById(state, action.payload.player)!;
        bus.put(cheatChangeEnergy(player.id, 10));

        // issue rebuildSpaceshipResponse
        bus.put(rebuildSpaceshipResponse(SpaceshipGetters.mapForRebuildSpaceshipResponse(player.spaceship)));
    });

    await runSaga(bus.env, rebuildSpaceship);

    expect(StateGetters.playerById(state, player.id)!.energy).toEqual(10);
});