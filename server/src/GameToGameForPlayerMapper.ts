import Game from "./Game";
import {GameForPlayerDTO, OtherPlayer} from "../../common/GameForPlayerDTO";
import Player from "../../common/Player";

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

        return dto;
    }
}