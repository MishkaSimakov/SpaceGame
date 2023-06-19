import Game from "../Game";
import Player from "../../../../common/Player";
import {plainToClass} from "../../../../common/PlainToClass";
import Spaceship from "../../../../common/Spaceship";

function setRebuildSpaceshipData(game: Game, player: Player) {
    if (!this.currentPlayer.canBeTurnedInto(player)) {
        throw new Error("Changed player has wrong cards or energy count");
    }

    if (!Spaceship.checkConfiguration(player.spaceship)) {
        throw new Error("Changed player has wrong spaceship configuration");
    }

    player.energy = Math.min(player.energy, player.spaceship.getTotalCapacity());

    game.changePlayerData(player);
}

export const rebuildSpaceship = async (game: Game) => {
    console.log("   Player start rebuilding spaceship");

    await game.emitToCurrentPlayerAndWait('rebuildSpaceship', (changedPlayer: Player) => {
        setRebuildSpaceshipData(game, plainToClass(changedPlayer, Player.getPropertiesMap()));

        console.log("   Player end rebuilding spaceship");
    });
}
