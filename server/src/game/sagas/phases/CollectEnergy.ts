import {SpaceshipGetters} from "@common/getters/Spaceship";
import {StateGetters} from "@common/getters/State";
import {changePlayerEnergy, message} from "@common/Actions";

import {put, select} from "../runner/Effects";

export function* collectEnergy() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    const newEnergy = Math.min(
        SpaceshipGetters.getTotalCapacity(currentPlayer.spaceship),
        currentPlayer.energy + SpaceshipGetters.getTotalEnergyIncrease(currentPlayer.spaceship)
    );
    const energyIncrease = newEnergy - currentPlayer.energy;

    yield* put(changePlayerEnergy(currentPlayer.id, newEnergy - currentPlayer.energy, "before turn"));

    if (energyIncrease > 0) {
        yield* put(message(currentPlayer.id, `получил +${energyIncrease}⚡ перед ходом`));
    }
}
