import BaseEventListener from "./BaseEventListener";
import Module from "../../../../common/modules/Module";
import {Event} from "../../../../common/events/Event";
import Game from "../../Game";
import SocketManager from "../SocketManager";

export default class InfoEventListener extends BaseEventListener {
    socket: SocketManager;
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