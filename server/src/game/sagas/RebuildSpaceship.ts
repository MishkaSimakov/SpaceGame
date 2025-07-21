import Game from "../Game";
import Player from "../../../../common/Player";
import {plainToClass} from "../../../../common/PlainToClass";
import Spaceship from "../../../../common/Spaceship";
import {all, put, select, take} from "../Effects";
import {
    rebuildSpaceshipRequest,
    rebuildSpaceshipResponse,
    playerRebuiltSpaceship
} from "../actions/Actions";

// function setRebuildSpaceshipData(game: Game, player: Player) {
//     if (!game.currentPlayer.canBeTurnedInto(player)) {
//         throw new Error("Changed player has wrong cards or energy count");
//     }
//
//     if (!Spaceship.checkConfiguration(player.spaceship)) {
//         throw new Error("Changed player has wrong spaceship configuration");
//     }
//
//     player.energy = Math.min(player.energy, player.spaceship.getTotalCapacity());
//
//     game.changePlayerData(player);
// }

export function* rebuildSpaceship() {
    const state = yield* select();
    const currentPlayerId = state.players[state.currentPlayerIndex].id;

    console.log("   Player start rebuilding spaceship");

    const {req, res} = yield* all({
        req: put(rebuildSpaceshipRequest(currentPlayerId)),
        res: take(rebuildSpaceshipResponse)
    });

    yield* put(playerRebuiltSpaceship(currentPlayerId, res.payload.newSpaceship, res.payload.newHand));

    console.log("   Player end rebuilding spaceship");
}
