import * as assert from "node:assert";

import {Request, Response} from "express";

import {GameSettings} from "@common/Types";

import App from "../../App";
import {User} from "@src/database/entity/user";
import {AuthenticatedRequest} from "../middleware/auth";
import {AuthenticatedGameRequest} from "../middleware/GameOwner";
import {Game as GameDBEntity, GameStatus} from "../../database/entity/game";
import {defaultSettings, defaultTimeControlSettings} from "@src/game/DefaultSettings";
import {FileActionsStorage} from "@src/game/FileActionsStorage";
import {createGameValidator} from "@src/http/validation/CreateGameValidator";
import {render} from "@src/helpers/Render";

export const create = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const users = await User.find();

        const {data, error} = createGameValidator(users).safeParse(req.body);
        if (error) {
            // TODO: display zod error
            console.log(error);
            req.flash('error', 'Что-то не так с параметрами игры.');
            return res.redirect('/');
        }

        const selectedUsers = data.players.map(id => {
            const user = users.find(u => u.id === id);
            assert.ok(user);
            return user;
        });

        const gameSettings: GameSettings = {
            seed: String(Math.random()),
            ...defaultSettings,

            isDebug: data.isDebug,
            isPublic: data.isPublic
        };

        if (data.withTimeControl) {
            assert.ok(data.loseWhenTimeout !== undefined);
            assert.ok(data.startTime !== undefined);
            assert.ok(data.defaultTimeIncrease !== undefined);
            assert.ok(data.fightTimeIncrease !== undefined);

            gameSettings.timeControlSettings = {
                loseWhenTimeout: data.loseWhenTimeout,
                startTime: data.startTime * 1000,
                defaultTimeIncrease: data.defaultTimeIncrease * 1000,
                fightTimeIncrease: data.fightTimeIncrease * 1000
            };
        }

        const gamesManager = App.getInstance().gamesManager;
        assert.ok(gamesManager);
        await gamesManager.createGame(data.name, req.user, selectedUsers, gameSettings);

        return res.redirect('/');
    } catch (err) {
        console.log(err);
        return res.redirect('/game/create');
    }
};

export const joinGame = async (req: AuthenticatedGameRequest, res: Response) => {
    const game = await GameDBEntity.findOne({
        where: {
            id: req.params.gameId,
        },
        relations: {
            players: true,
        }
    });

    if (!game) {
        req.flash('error', 'Вы не можете присоединиться к данной игре.');
        return res.redirect('/');
    }

    if (game.players.find(p => p.id === req.user.id) === undefined) {
        req.flash('error', 'Вы не можете присоединиться к данной игре.');
        return res.redirect('/');
    }

    if (game.status === GameStatus.FINISHED) {
        req.flash('error', 'Вы не можете присоединиться к данной игре.');
        return res.redirect('/');
    }

    return render(res, 'game/game');
};

export const showCreatePage = async (req: AuthenticatedRequest, res: Response) => {
    const users = await User.createQueryBuilder("user")
        .select(['id', 'login'])
        .getRawMany();

    return render(res, 'game/create', {
        users: users,
        defaultSettings,
        defaultTimeControlSettings
    });
};

export const showRules = (req: Request, res: Response) => {
    render(res, 'game/rules');
};

export const showStatusPage = async (req: AuthenticatedGameRequest, res: Response) => {
    const game = await GameDBEntity.findOne({
        where: {
            id: req.params.gameId,
        },
        relations: {
            owner: true,
            players: true,
            winner: true
        }
    });

    if (!game) {
        req.flash('error', 'Не удалось найти нужную игру');
        return res.redirect('/');
    }

    const gamesManager = App.getInstance().gamesManager;
    assert.ok(gamesManager);

    return render(res, 'game/status', {
        game: {
            ...game,
            settings: game.settings,
            actions: new FileActionsStorage(game.logFilepath).getActionsWithStorageInfo(),
            isActive: gamesManager.isActive(game.id)
        }
    });
};

export const deleteGame = async (req: AuthenticatedGameRequest, res: Response) => {
    const gamesManager = App.getInstance().gamesManager;
    assert.ok(gamesManager);
    await gamesManager.deactivateGame(req.params.gameId);

    await GameDBEntity.delete({
        id: req.params.gameId
    });

    return res.redirect('/');
};

export const deactivateGame = async (req: AuthenticatedGameRequest, res: Response) => {
    const gamesManager = App.getInstance().gamesManager;
    assert.ok(gamesManager);
    await gamesManager.deactivateGame(req.params.gameId);
    return res.redirect('/');
};

export const deleteAllGames = async (req: Request, res: Response) => {
    const games = await GameDBEntity.find();

    const gamesManager = App.getInstance().gamesManager;
    assert.ok(gamesManager);

    for (const game of games) {
        await gamesManager.deactivateGame(game.id);

        await GameDBEntity.delete({
            id: game.id
        });
    }

    return res.redirect('/');
};


export const createGame = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const users = await User.find();
        const gameSettings: GameSettings = {
            seed: String(Math.random()),
            ...defaultSettings,

            isDebug: true,
            isPublic: true,
        };

        const gamesManager = App.getInstance().gamesManager;
        assert.ok(gamesManager);
        const gameId = await gamesManager.createGame("Игра", req.user, users, gameSettings);

        return res.redirect(`/game/${gameId}`);
    } catch {
        return res.redirect('/game/create');
    }
};