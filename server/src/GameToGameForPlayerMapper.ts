import Game from "./Game";
import {GameForPlayerDTO} from "../../common/GameForPlayerDTO";

export default class GameToGameForPlayerMapper {
    static getDTO(game: Game, forPlayer: number): GameForPlayerDTO {
        let dto = new GameForPlayerDTO();

        dto.player = game.getPlayerByLink(forPlayer);
        dto.otherPlayers = game.players.filter(p => p.link !== forPlayer).map(p => {
           return {
               link: p.link,
               energy: p.energy,
               online: p.online,
               spaceship: p.spaceship,
               handSize: p.hand.length
           };
        });

        dto.settings = {
            withTimeControl: game.withTimeControl
        };

        return dto;
    }
}