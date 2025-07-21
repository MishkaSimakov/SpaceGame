import Game from "../Game";

export const collectEnergy = async (game: Game) => {
    game.currentPlayer.collectEnergy();

    game.changePlayerData(game.currentPlayer);

    console.log("   Player received energy");
}
