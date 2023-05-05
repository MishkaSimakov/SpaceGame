import Game from "../../Game";
import {Socket} from "socket.io-client";
import TopBarDrawer from "../../graphics/TopBarDrawer";
import RebuildSpaceshipManager from "../../graphics/RebuildSpaceshipManager";
import Controls from "../../graphics/scenes/game/controls";

export default class BaseEventListener {
    socket: Socket;
    game: Game;

    constructor(socket: Socket, game: Game) {
        this.socket = socket;
        this.game = game;

        this.addListeners();
    }

    addListeners() {};

    rebuildSpaceshipManager(): RebuildSpaceshipManager {
        return this.game.rebuildSpaceshipManager;
    }

    controls(): Controls {
        return this.game.controlsScene;
    }
}