import BaseEventListener from "./BaseEventListener";
import Module, {isModule} from "../../../../common/modules/Module";
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
        this.socket.on('showCards', (playerId: number, cards: (Module | Event)[]) => {
            let playerName = this.game.getPlayerById(playerId)?.name || playerId;

            this.controls().showCards(
                cards,
                playerId === this.game.currentPlayer.id ? "вы вытянули" : (playerName + " вытянул")
            );
        });

        this.socket.on('showCardsAndWait', (playerId: number, cards: (Module | Event)[], callback: () => void) => {
            let playerName = this.game.getPlayerById(playerId)?.name || playerId;

            this.controls().showCards(
                cards,
                playerId === this.game.currentPlayer.id ? "вы вытянули" : (playerName + " вытянул")
            ).then(callback);
        });
    }
}
