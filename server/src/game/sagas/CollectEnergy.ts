import {put, select} from "../Effects";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {collectEnergyBeforeTurn} from "../actions/Main";

export function* collectEnergy() {
    const state = yield* select();
    const player = state.players[state.currentPlayerIndex];

    const maxEnergy = SpaceshipGetters.getTotalCapacity(player.spaceship);
    const newEnergy = Math.max(maxEnergy, SpaceshipGetters.getTotalEnergyIncrease(player.spaceship))

    yield* put(
        collectEnergyBeforeTurn(player.id, newEnergy - player.energy)
    );
}
