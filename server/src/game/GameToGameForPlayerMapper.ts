import Game from "./Game";
import {GameForPlayerDTO} from "../../../common/GameForPlayerDTO";
import Player from "../../../common/Player";

export const getDTO = (game: Game, forPlayer: Player): GameForPlayerDTO => {
    let dto = new GameForPlayerDTO();

    dto.player = game.getPlayerById(forPlayer.id);

    dto.otherPlayers = game.players
        .filter(p => p.id !== forPlayer.id)
        .map(p => p.getOtherPlayer());

    dto.settings = game.settings;

    if (game.settings.withTimeControl) {
        dto.timeControl = {
            timeDecreasingPlayerId: game.timeManager.getTimeDecreasingPlayerId(),
            playersTime: game.timeManager.getPlayersTime()
        };
    }

    dto.messages = game.messageManager.messages;

    return dto;
}
