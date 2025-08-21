import {GameSettings, Message, Player, PlayerId, Spaceship} from "./Types";

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
