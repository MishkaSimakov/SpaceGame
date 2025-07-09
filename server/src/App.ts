import DatabaseManager from "./database/DatabaseManager";
import GamesManager from "./game/GamesManager";
import ServerManager from "./http/ServerManager";

import dotenv from 'dotenv';

export default class App {
    private static instance: App;

    databaseManager: DatabaseManager;
    gamesManager: GamesManager;
    serverManager: ServerManager;

    private constructor() {}

    async init() {
        // init environment
        dotenv.config({
            path: "./server/.env"
        });

        // init database connection
        this.databaseManager = new DatabaseManager();
        await this.databaseManager.initConnection();

        // init http server
        this.serverManager = new ServerManager();
        this.serverManager.initServer();

        // init sockets
        let io = this.serverManager.initSockets();

        // init games manager
        this.gamesManager = new GamesManager(io);

        // start server
        this.serverManager.runServer();
    }

    static getInstance(): App {
        return this.instance ?? (this.instance = new App());
    }
}
