import * as fs from "fs";
import Game from "./Game";
import * as path from "path";

export default class Logger {
    logFilename: string;
    writeStream: fs.WriteStream;
    game: Game;
    constructor(game: Game) {
        this.logFilename = 'game_' + Date.now() + '.log';
        this.game = game;

        this.writeStream = fs.createWriteStream(this.getLogPath());
    }

    log(action: string) {
        let data = {
            action: action,
            players: this.game.players
        };

        try {
            this.writeStream.write(JSON.stringify(data));
        } catch (err) {
            console.error(err);
        }
    }

    private getLogPath(): string {
        return path.join(__dirname, '/../logs', this.logFilename)
    }
}