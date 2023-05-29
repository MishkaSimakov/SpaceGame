import GamesManager from "../game/GamesManager";
import {Server} from "socket.io";

export default class GameController {
    gamesManager: GamesManager;
    io: Server;

    constructor(io: Server) {
        this.gamesManager = new GamesManager(io);
        this.io = io;
    }
}