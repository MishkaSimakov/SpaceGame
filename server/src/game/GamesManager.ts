import {Server, Socket} from "socket.io";
import Game from "./Game";
import Player from "../../../common/Player";
import {GameSettings} from "../../../common/GameForPlayerDTO";
import {User} from "../entity/user";

export default class GamesManager {
    io: Server;

    games: Game[] = [];

    constructor(io: Server) {
        this.io = io;

        io.on('connection', async (socket: Socket) => {
            console.log("User connected");

            let player: Player;

            socket.on('disconnect', () => {
                if (player === undefined) {
                    console.log("disconnected");
                    return;
                }

                console.log(`disconnected user with link: ${player.link}`)
                player.socketId = undefined;
                player.online = false;

                this.getGameByLink(player.link).syncPlayersData();
            });

            io.sockets.sockets.get(socket.id).emit('getLink', async (link: number) => {
                let game = this.getGameByLink(link);

                if (!game) {
                    console.log("Connected user doesn't exist");

                    socket.disconnect();

                    return;
                }

                player = game.playerConnected(link, socket.id);
            });
        });
    }

    createGame(name: string, users: User[], settings: GameSettings): Game {
        let game = new Game(name, users, settings, this.io);

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
