import Player from "./Player";
import Spaceship from "./Spaceship";
import {Options} from "./PlainToClass";
import Module from "./modules/Module";
import {Message} from "./Types";

type GameSettings = {
    size: number,
    withTimeControl: boolean,
};

class OtherPlayer {
    link: number;
    energy: number;
    online: boolean;
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
    settings: GameSettings;
    player: Player;
    otherPlayers: OtherPlayer[];

    timeControl: {
        timeDecreasingPlayerLink: number;
        playersTime: Record<number, number>
    };

    messages: Message[];
}

export { GameSettings, GameForPlayerDTO, OtherPlayer };