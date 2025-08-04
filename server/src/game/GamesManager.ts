import {Server, Socket} from "socket.io";
import Player from "../../../common/Player";
import {User} from "../entity/user";
import jwt, {JwtPayload} from "jsonwebtoken";
import {Game as GameDBEntity} from "../entity/game";
import Game from "./Game";
import SocketsManager from "./io/SocketsManager";
import {GameSettings} from "@common/GameSettings";
import {SocketInitPayload} from "@common/Types";
import path from "path";
import {Logger} from "./Logger";
import * as assert from "node:assert";

export default class GamesManager {
    io: Server;

    games: Record<string, Game> = {};

    constructor(io: Server) {
        this.io = io;

        io.on('connection', async (socket: Socket) => {
            let game: Game;
            let player: Readonly<Player>;

            socket.on('init', async (payload: SocketInitPayload) => {
                const result = await this.#joinGame(payload.token, payload.gameId);

                if (result instanceof Error) {
                    socket.emit("error", result.message);
                    socket.disconnect();
                } else {
                    game = result.game;
                    player = result.player;

                    game.sockets.onPlayerConnect(player.id, socket.id);
                    game.syncPlayersData();
                    game.sockets.tryToEmitEvent(player.id);
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

    async #joinGame(token: string, gameId: string) {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

        const user = await User.findOneBy({
            id: (decodedToken as JwtPayload)._id
        });

        if (!user) {
            return new Error("Failed to find the user");
        }

        const game = await this.getGame(gameId);

        if (!game) {
            return new Error("Failed to find the game");
        }

        const player = game.getPlayerById(user.id);

        if (!player) {
            return new Error("User can not join this game");
        }

        return {player, game};
    }

    async createGame(name: string, users: User[], settings: GameSettings): Promise<string> {
        const gameId = await this.#createGameId();
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
            users,
            settings,
            new SocketsManager(this.io, users.map(u => u.id)),
            new Logger(logFilepath)
        );

        game.start().then(async () => {
            game.sockets.disconnectEveryone();
            await this.storeGameResult(gameId, game);
        });

        this.games[gameId] = game;

        return gameId;
    }

    async storeGameResult(gameId: string, game: Game) {
        const gameEntity = await GameDBEntity.findOneBy({
            id: gameId
        });

        const winner = game.state.players.find(p => !p.lose);
        assert.ok(winner);

        gameEntity.winner = await User.findOneBy({id: winner.id});
        gameEntity.finishedAt = new Date();

        await gameEntity.save();
    }

    async getGame(id: string): Promise<Game | undefined> {
        // search in RAM
        if (id in this.games) {
            return this.games[id];
        }

        // search in DB
        const game = await GameDBEntity.findOne({
            where: {id,},
            relations: {
                players: {}
            }
        });

        if (game && !game.finishedAt) {
            return await this.#activateGame(game);
        }

        return undefined;
    }

    async #activateGame(gameEntity: GameDBEntity): Promise<Game> {
        const users = gameEntity.players;

        const {game, promise} = Game.runFromLogs(
            users,
            new SocketsManager(this.io, users.map(u => u.id)),
            new Logger(gameEntity.logFilepath)
        );

        promise.then(async () => {
            game.sockets.disconnectEveryone();
            await this.storeGameResult(gameEntity.id, game);
        });

        this.games[gameEntity.id] = game;

        return game;
    }

    async #hasGame(id: string): Promise<boolean> {
        return (id in this.games) || !!(await GameDBEntity.findOneBy({id}));
    }

    async #createGameId(length: number = 4): Promise<string> {
        let result: string;

        do {
            result = '';

            const characters: string = 'abcdefghjkmnpqrstuvwxyz23456789';

            for (let i = 0; i < length; ++i) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        } while (await this.#hasGame(result));

        return result;
    }
}
