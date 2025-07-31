import {Server, Socket} from "socket.io";
import Player from "../../../common/Player";
import {User} from "../entity/user";
import {parse} from "cookie";
import jwt, {JwtPayload} from "jsonwebtoken";
import {Game as GameDBEntity} from "../entity/game";
import Game from "./Game";
import SocketsManager from "./io/SocketsManager";
import {GameSettings} from "@common/GameSettings";
import {SocketInitPayload} from "@common/Types";
import path from "path";
import {Logger} from "./Logger";

export default class GamesManager {
    io: Server;

    games: Game[] = [];

    constructor(io: Server) {
        this.io = io;

        io.on('connection', async (socket: Socket) => {
            let game: Game;
            let player: Readonly<Player>;

            socket.on('init', async (payload: SocketInitPayload) => {
                try {
                    const decodedToken = jwt.verify(payload.token, process.env.JWT_SECRET_KEY);

                    const user = await User.findOneBy({
                        id: (decodedToken as JwtPayload)._id
                    });

                    game = this.getGameById(payload.gameId);

                    if (!game) {
                        throw Error("No game found for the given id.")
                    }

                    player = game!.getPlayerById(user.id);

                    if (player) {
                        // TODO: better encapsulate reemit inside SocketsManager
                        game.sockets.onPlayerConnect(player.id, socket.id);

                        game.syncPlayersData();

                        game.sockets.tryToEmitEvent(player.id);
                    } else { // game is public and player is undefined
                        throw new Error("Viewers are not implemented!");
                    }
                } catch (e) {
                    console.log(e);
                    socket.disconnect();
                    return;
                }
            });

            socket.on('disconnect', () => {
                if (!game || !player) {
                    return;
                }

                console.log(`${player.name} disconnected`);

                game.sockets.onPlayerDisconnect(player.id);

                game.syncPlayersData();
            });
        });
    }

    async createGame(name: string, users: User[], settings: GameSettings): Promise<Game> {
        const gameId = this.createGameId();
        const logFilepath = path.join(__dirname, '/../../logs/', `game_${Date.now()}_${gameId}.txt`);

        // create database entity
        let gameDB = new GameDBEntity();

        gameDB.id = gameId;
        gameDB.name = name;
        gameDB.players = users;
        gameDB.logFilepath = logFilepath

        await gameDB.save();

        // create RAM game entity
        const game = new Game(
            gameId,
            name,
            users,
            settings,
            new SocketsManager(this.io, users.map(u => u.id)),
            new Logger(logFilepath)
        );

        game.start().then(async () => {
            game.sockets.disconnectEveryone();

            // if (game.state !== GameState.ERROR) {
            //     await this.archiveGame(game);
            // }

            let gameId = this.games.findIndex(g => g.id === game.id);

            // TODO: check later
            // delete this.games[gameId];
            this.games.splice(gameId, 1);
        });

        this.games.push(game);

        return game;
    }

    async archiveGame(game: Game) {
        // TODO: uncomment
        // const users = await User.find();
        // const winnerPlayer = Object.values(game.players).filter(player => !player.isLose())[0];
        // const winnerUser = await User.findOneBy({
        //     id: winnerPlayer.id
        // });
        //
        // console.log(`Game end. Player ${winnerPlayer.name} has won`);
        //
        // if (!winnerUser) {
        //     return;
        // }
        //
        // let archivedGame = new ArchivedGame();
        //
        // archivedGame.name = game.name;
        // archivedGame.winner = winnerUser;
        // archivedGame.players = game.players.map(p => {
        //     return users.find(u => u.id === p.id);
        // });
        //
        // await archivedGame.save();
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
            return game.users.find(u => u.id === user.id) !== undefined || game.state.settings.isPublic;
        });
    }

    private createGameId(length: number = 4): string {
        let result: string;

        do {
            result = '';

            const characters: string = 'abcdefghjkmnpqrstuvwxyz23456789';

            for (let i = 0; i < length; ++i) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        } while (this.getGameById(result));

        return result;
    }
}
