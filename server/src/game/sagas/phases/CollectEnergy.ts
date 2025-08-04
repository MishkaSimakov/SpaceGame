import {put, select} from "../../Effects";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {changePlayerEnergy} from "@common/actions/Main";
import {StateGetters} from "@common/getters/State";

export function* collectEnergy() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    const newEnergy = Math.min(
        SpaceshipGetters.getTotalCapacity(currentPlayer.spaceship),
        currentPlayer.energy + SpaceshipGetters.getTotalEnergyIncrease(currentPlayer.spaceship)
    );

    yield* put(
        changePlayerEnergy(currentPlayer, newEnergy - currentPlayer.energy, "before turn")
    );
}
