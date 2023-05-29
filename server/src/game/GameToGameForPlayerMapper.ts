import Game from "./Game";
import {GameForPlayerDTO} from "../../../common/GameForPlayerDTO";

export default class GameToGameForPlayerMapper {
    static getDTO(game: Game, forPlayer: number): GameForPlayerDTO {
        let dto = new GameForPlayerDTO();

        dto.player = game.getPlayerByLink(forPlayer);

        dto.otherPlayers = game.players
            .filter(p => p.link !== forPlayer)
            .map(p => p.getOtherPlayer());

        dto.settings = {
            withTimeControl: game.withTimeControl
        };

        if (game.withTimeControl) {
            dto.timeControl = {
                timeDecreasingPlayerLink: game.timeManager.getTimeDecreasingPlayerLink(),
                playersTime: game.timeManager.getPlayersTime()
            };
        }

        return dto;
    }
}