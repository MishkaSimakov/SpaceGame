import Player, {PlayerId} from "./Player";
import Spaceship from "./Spaceship";
import {Options} from "./PlainToClass";
import Module from "./modules/Module";
import {Message} from "./Types";
import {GameSettings, TimeControlSettings} from "./GameSettings";

class OtherPlayer {
    id: number;
    name: string;
    energy: number;
    spaceship: Spaceship;
    handSize: number;

    static getPropertiesMap(): Options {
        return {
            spaceship: {
                class: Spaceship,

                modules: {
                    class: Module
                }
            }
        };
    }
}

class GameForPlayerDTO {
    currentTurnPlayerId: PlayerId;

    settings: GameSettings;
    player: Player;
    otherPlayers: OtherPlayer[];
    onlineMap: Record<PlayerId, boolean>;

    timeControl: {
        timeDecreasingPlayerId: number;
        playersTime: Record<number, number>
    };

    messages: Message[];
}

export {GameForPlayerDTO, OtherPlayer};
