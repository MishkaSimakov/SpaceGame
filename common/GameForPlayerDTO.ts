import Player, {PlayerId} from "./Player";
import Spaceship from "./Spaceship";
import {Message} from "./Types";
import {GameSettings} from "./GameSettings";

type OtherPlayer = {
    id: number;
    name: string;
    energy: number;
    spaceship: Spaceship;
    handSize: number;
    lose: boolean;
};

type GameForPlayerDTO = {
    currentTurnPlayerId: PlayerId;

    settings: GameSettings;
    player: Player;
    otherPlayers: OtherPlayer[];
    onlineMap: Record<PlayerId, boolean>;

    timeControl?: {
        timeDecreasingPlayerId: number | undefined;
        playersTime: Record<number, number>
    };

    messages: Message[];
}

export {GameForPlayerDTO, OtherPlayer};
