import BaseEventListener from "./BaseEventListener";
import Spaceships from "../../graphics/scenes/game/spaceships";
import Controls from "../../graphics/scenes/game/controls";
import {Socket} from "socket.io-client";
import Module from "../../../../common/modules/Module";
import {Event} from "../../../../common/events/Event";
import Game from "../../Game";

export default class InfoEventListener extends BaseEventListener {
    socket: Socket;
    game: Game;

    constructor(...args: ConstructorParameters<typeof BaseEventListener>) {
        super(...args);
    }

    addListeners(): void {
        this.socket.on('showCard', (card: Module | Event) => {
            this.controls().showCard(card);
        });
    }
}