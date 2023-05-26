import Player from "./Player";
import Spaceship from "./Spaceship";

type GameSettings = {
    withTimeControl: boolean,
};

type OtherPlayer = {
    link: number,
    energy: number,
    online: boolean,
    spaceship: Spaceship,
    handSize: number
};

class GameForPlayerDTO {
    settings: GameSettings;
    player: Player;
    otherPlayers: OtherPlayer[];
}

export { GameSettings, GameForPlayerDTO, OtherPlayer };