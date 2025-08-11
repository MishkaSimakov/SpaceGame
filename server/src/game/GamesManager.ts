import {Server, Socket} from "socket.io";
import Player from "../../../common/Player";
import {User} from "../entity/user";
import jwt, {JwtPayload} from "jsonwebtoken";
import {Game as GameDBEntity, GameStatus} from "../entity/game";
import Game from "./Game";
import SocketsManager from "./io/SocketsManager";
import {GameSettings} from "@common/GameSettings";
import {SocketInitPayload} from "@common/Types";
import path from "path";
import {Logger} from "./Logger";
import * as assert from "node:assert";

export default class GamesManager {
    io: Server;

    activeGames: Record<string, Game> = {};

    constructor(io: Server) {
        this.io = io;

        io.on('connection', async (socket: Socket) => {
            let game: Game;
            let player: Readonly<Player>;

            socket.on('init', async (payload: SocketInitPayload) => {
                const result = await this.joinGame(payload.token, payload.gameId);

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

    deactivateGame(gameId: string) {
        const game = this.activeGames[gameId];

        if (!game) {
            return;
        }

        game.sagaRunner.cancel('gameSaga');
        game.sockets.disconnectEveryone();

        delete this.activeGames[gameId];
    }

    isActive(gameId: string): boolean {
        return gameId in this.activeGames;
    }

    private async joinGame(token: string, gameId: string) {
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

    async createGame(name: string, owner: User, users: User[], settings: GameSettings): Promise<string> {
        const gameId = await this.createGameId();
        const logFilepath = path.join(__dirname, '/../../logs/', `game_${Date.now()}_${gameId}.txt`);

        // create database entity
        const gameDB = new GameDBEntity();

        Object.assign(gameDB, {
            id: gameId,
            name,
            owner,
            players: users,
            logFilepath,
            settings,
            status: GameStatus.ACTIVE,
            createdAt: new Date()
        });

        await gameDB.save();

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
        if (id in this.activeGames) {
            return this.activeGames[id];
        }

        // search in DB
        const game = await GameDBEntity.findOne({
            where: {id,},
            relations: {
                players: {}
            }
        });

        if (game && game.status === GameStatus.ACTIVE) {
            return await this.activateGame(game);
        }

        return undefined;
    }

    private async activateGame(gameEntity: GameDBEntity): Promise<Game> {
        try {
            const game = new Game(
                gameEntity.players,
                gameEntity.settings,
                new SocketsManager(this.io, gameEntity.players.map(u => u.id)),
                new Logger(gameEntity.logFilepath)
            );

            game.activate()
                .then(async (result) => {
                    game.sockets.disconnectEveryone();
                    await this.storeGameResult(gameEntity.id, game);
                })
                .catch(err => this.reportGameError(gameEntity, err));

            this.activeGames[gameEntity.id] = game;

            return game;
        } catch (err) {
            await this.reportGameError(gameEntity, err);
        }
    }

    private async hasGame(id: string): Promise<boolean> {
        return (id in this.activeGames) || !!(await GameDBEntity.findOneBy({id}));
    }

    private async createGameId(length: number = 4): Promise<string> {
        let result: string;

        do {
            result = '';

            const characters: string = 'abcdefghjkmnpqrstuvwxyz23456789';

            for (let i = 0; i < length; ++i) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
        } while (await this.hasGame(result));

        return result;
    }

    private async reportGameError(game: GameDBEntity, error: Error) {
        console.warn("⚠️ error in game:", error);

        try {
            this.deactivateGame(game.id);
        } catch (deactivationError) {
            console.warn("💀 failed even to deactivate the game:", deactivationError);
        }

        game.status = GameStatus.ERROR;
        await game.save();
    }
}
