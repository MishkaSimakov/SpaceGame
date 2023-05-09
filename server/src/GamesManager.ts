import {Server} from "socket.io";
import Game from "./Game";

export default class GamesManager {
    io: Server;

    games: Game[] = [];

    constructor(io: Server) {
        this.io = io;
    }

    createGame(playersCount: number): Game {
        let game = new Game(playersCount, this.io);

        game.start().then(() => {
            for (let player of game.players)
                game.getSocket(player).disconnect();
        });

        this.games.push(game);

        return game;
    }

    checkPlayerLinkExist(link: number): boolean {
        return this.getGameByLink(link) !== undefined;
    }

    getGameByLink(link: number): Game {
        for (let game of this.games) {
            if (game.getLinks().indexOf(link) !== -1) {
                return game;
            }
        }

        return undefined;
    }
}