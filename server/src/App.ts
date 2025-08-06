import dotenv from 'dotenv';

import DatabaseManager from "./database/DatabaseManager";
import GamesManager from "./game/GamesManager";
import ServerManager from "./http/ServerManager";

export default class App {
    private static instance: App;

    databaseManager: DatabaseManager;
    gamesManager: GamesManager;
    serverManager: ServerManager;

    private constructor() {
    }

    async init() {
        // init environment
        const output = dotenv.config({
            path: ".env"
        });

        if (output.error) {
            throw output.error;
        }

        // init database connection
        this.databaseManager = new DatabaseManager();
        await this.databaseManager.initConnection();
        await this.databaseManager.fakeUsers();

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
