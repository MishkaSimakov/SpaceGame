import * as assert from "node:assert";
import {Server, Socket} from "socket.io";
import path from "path";
import jwt, {JwtPayload} from "jsonwebtoken";

import {GameSettings, Player, PlayerId} from "@common/Types";
import {SocketInitPayload} from "@common/SocketsTypes";

import {User} from "../database/entity/user";
import {Game as GameDBEntity, GameStatus} from "../database/entity/game";
import Game from "./Game";
import SocketsManager from "./io/SocketsManager";
import {FileActionsStorage} from "@src/game/FileActionsStorage";
import {JSClock} from "@src/game/JSClock";

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
                    socket.disconnect();
                } else {
                    game = result.game;
                    player = result.player;

                    game.onPlayerConnect(player.id, socket.id);
                }
            });

            socket.on('disconnect', () => {
                if (!game || !player) {
                    return;
                }

                game.onPlayerDisconnect(player.id);
            });
        });
    }

    async deactivateGame(gameId: string) {
        const game = this.activeGames[gameId];

        if (!game) {
            return;
        }

        await game.deactivate();
    }

    isActive(gameId: string): boolean {
        return gameId in this.activeGames;
    }

    private async joinGame(token: string, gameId: string) {
        assert.ok(process.env.JWT_SECRET_KEY, "Secret token must be set in .env file.");
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

        const user = await User.findOneBy({
            id: (decodedToken as JwtPayload).id
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

    async storeGameResult(gameId: string, winner: PlayerId) {
        const gameEntity = await GameDBEntity.findOneBy({
            id: gameId
        });

        assert.ok(gameEntity);

        // TODO: strict typing for typeorm
        // @ts-expect-error findOneBy returns User | null, while winner is typed as User
        gameEntity.winner = await User.findOneBy({id: winner});
        gameEntity.status = GameStatus.FINISHED;
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
            where: {id},
            relations: {
                players: {}
            }
        });

        if (!game || game.status === GameStatus.FINISHED) {
            return undefined;
        }

        if (game.status === GameStatus.ERROR) {
            game.status = GameStatus.ACTIVE;
            await game.save();
        }

        return await this.activateGame(game);
    }

    private async activateGame(gameEntity: GameDBEntity): Promise<Game | undefined> {
        try {
            const game = new Game(
                gameEntity.players,
                gameEntity.settings,
                new SocketsManager(this.io, gameEntity.players.map(u => u.id)),
                new FileActionsStorage(gameEntity.logFilepath),
                new JSClock()
            );

            game.activate()
                .then(async (result) => {
                    game.sockets.disconnectEveryone();

                    if (result.type === "finished") {
                        await this.storeGameResult(gameEntity.id, result.winner);
                    }

                    delete this.activeGames[gameEntity.id];
                })
                .catch(err => this.handleGameError(gameEntity, err));

            this.activeGames[gameEntity.id] = game;

            return game;
        } catch (err) {
            await this.handleGameError(gameEntity, err);
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

    private async handleGameError(gameDB: GameDBEntity, error: any) {
        console.warn("⚠️ error in game:", error);

        // this should be done as early as possible so that no one connect to this game
        const game = this.activeGames[gameDB.id];
        delete this.activeGames[gameDB.id];

        try {
            await game.deactivate();
        } catch (deactivationError) {
            console.warn("💀 failed even to deactivate the game:", deactivationError);
        }

        gameDB.status = GameStatus.ERROR;
        await gameDB.save();
    }
}
