import Game from "../Game";
import {GameForPlayerDTO} from "@common/GameForPlayerDTO";
import Player from "@common/Player";
import {PlayerGetters} from "@common/getters/Player";

export const getDTO = (game: Game, forPlayer: Player): GameForPlayerDTO => {
    let dto = new GameForPlayerDTO();

    dto.player = game.getPlayerById(forPlayer.id);

    dto.otherPlayers = game.state.players
        .filter(p => p.id !== forPlayer.id)
        .map(PlayerGetters.forOtherPlayer);

    dto.settings = game.state.settings;

    if (game.state.settings.withTimeControl) {
        // dto.timeControl = {
        //     timeDecreasingPlayerId: game.timeManager.getTimeDecreasingPlayerId(),
        //     playersTime: game.timeManager.getPlayersTime()
        // };
    }

    dto.messages = [];

    return dto;
}
