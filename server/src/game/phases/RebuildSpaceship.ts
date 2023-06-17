import Game from "../Game";
import Player from "../../../../common/Player";
import {plainToClass} from "../../../../common/PlainToClass";

export const rebuildSpaceship = async (game: Game) => {
    console.log("   Player start rebuilding spaceship");

    await game.emitToCurrentPlayerAndWait('rebuildSpaceship', (changedPlayer: Player) => {
        game.setRebuildSpaceshipData(plainToClass(changedPlayer, Player.getPropertiesMap()));

        console.log("   Player end rebuilding spaceship");
    });
}
