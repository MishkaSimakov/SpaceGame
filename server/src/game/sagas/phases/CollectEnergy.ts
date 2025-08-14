import {put, select} from "../Effects";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import Actions from "@common/actions/Main";
import {StateGetters} from "@common/getters/State";


export function* collectEnergy() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    const newEnergy = Math.min(
        SpaceshipGetters.getTotalCapacity(currentPlayer.spaceship),
        currentPlayer.energy + SpaceshipGetters.getTotalEnergyIncrease(currentPlayer.spaceship)
    );
    const energyIncrease = newEnergy - currentPlayer.energy;

    yield* put(
        Actions.changePlayerEnergy(currentPlayer, newEnergy - currentPlayer.energy, "before turn")
    );

    if (energyIncrease > 0) {
        yield* put(Actions.message(currentPlayer, `получил +${energyIncrease}⚡ перед ходом`));
    }
}
