import Game from "../../Game";
import RebuildSpaceshipManager from "../../graphics/RebuildSpaceshipManager";
import Controls from "../../graphics/scenes/controls";
import SocketManager from "../SocketManager";

export default class BaseEventListener {
    socket: SocketManager;
    game: Game;

    constructor(socket: SocketManager, game: Game) {
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
