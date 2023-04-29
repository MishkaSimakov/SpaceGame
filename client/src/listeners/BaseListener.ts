import Game from "../scenes/game";
import Controls from "../scenes/controls";
import {Socket} from "socket.io-client";

export default class BaseListener {
    game: Game;
    controls: Controls;
    socket: Socket;
    link: number;

    constructor(game: Game, controls: Controls, socket: Socket, link: number) {
        this.game = game;
        this.controls = controls;
        this.socket = socket;
        this.link = link;

        this.addListeners();
    }

    addListeners() {};
}