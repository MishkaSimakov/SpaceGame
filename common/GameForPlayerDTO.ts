import Player from "./Player";
import Spaceship from "./Spaceship";
import {Options} from "./PlainToClass";
import Module, {isModule} from "./modules/Module";
import {Event} from "./events/Event";

type GameSettings = {
    withTimeControl: boolean,
};

class OtherPlayer {
    link: number;
    energy: number;
    online: boolean;
    spaceship: Spaceship;
    handSize: number;
    time: number;

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
}

export { GameSettings, GameForPlayerDTO, OtherPlayer };