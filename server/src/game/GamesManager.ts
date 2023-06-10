import {Server, Socket} from "socket.io";
import Game from "./Game";
import Player from "../../../common/Player";
import {GameSettings} from "../../../common/GameForPlayerDTO";
import {User} from "../entity/user";
import cookie from "cookie";
import jwt, {JwtPayload} from "jsonwebtoken";

export default class GamesManager {
    io: Server;

    games: Game[] = [];

    constructor(io: Server) {
        this.io = io;

        io.on('connection', async (socket: Socket) => {
            let game: Game;
            let player: Player;

            socket.on('gameId', async (gameId: string) => {
                try {
                    let cookies = cookie.parse(socket.request.headers.cookie);
                    let decodedToken = jwt.verify(cookies.authentication_token, process.env.JWT_SECRET_KEY);

                    let user = await User.findOneBy({
                        id: (decodedToken as JwtPayload)._id
                    });

                    game = this.getGameById(gameId);
                    player = game?.getPlayerById(user.id);

                    if (!player) {
                        throw Error();
                    }

                    game.playerConnected(player, socket.id);
                } catch (e) {
                    socket.disconnect();
                    return;
                }
            });

            socket.on('disconnect', () => {
                if (!player || !game)
                    return;

                console.log(`${player.name} disconnected`)
                player.socketId = undefined;
                player.online = false;

                game.syncPlayersData();
            });
        });
    }

    createGame(name: string, users: User[], settings: GameSettings): Game {
        let game = new Game(this.createGameId(), name, users, settings, this.io);

        game.start().then(() => {
            for (let player of game.players)
                game.getSocket(player).disconnect();
        });

        this.games.push(game);

        return game;
    }

    getGameById(id: string): Game {
        for (let game of this.games) {
            if (game.id === id)
                return game;
        }

        return undefined;
    }

    getGamesOfUser(user: User) {
        return this.games.filter(game => {
            return game.players.find(u => u.id === user.id);
        });
    }

    private createGameId(length: number = 4): string {
        let result = '';
        const characters: string = 'abcdefghjkmnpqrstuvwxyz23456789';

        for (let i = 0; i < length; ++i) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        return result;
    }
}
