import {Request, Response} from "express";

import {GameSettings} from "@common/Types";

import App from "../../App";
import {User} from "../../database/entity/user";
import {AuthenticatedRequest} from "../middleware/auth";
import {AuthenticatedGameRequest} from "../middleware/GameOwner";
import {Game as GameDBEntity, GameStatus} from "../../database/entity/game";
import {defaultSettings, defaultTimeControlSettings} from "../../game/DefaultSettings";
import {FileActionsStorage} from "@src/game/FileActionsStorage";
import {createGameValidator} from "@src/http/validation/CreateGameValidator";
import DatabaseManager from "@src/database/DatabaseManager";

export const create = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const users = await User.find();

        const {data, error} = createGameValidator(users).safeParse(req.body);
        if (error || !data) {
            // TODO: display zod error
            console.log(error);
            req.flash('error', 'Что-то не так с параметрами игры.');
            return res.redirect('/');
        }

        const selectedUsers = data.players.map(id => {
            return users.find(u => u.id === id)!;
        });

        const gameSettings: GameSettings = {
            seed: String(Math.random()),
            ...defaultSettings,

            isDebug: data.isDebug,
            isPublic: data.isPublic
        };

        if (data.withTimeControl) {
            gameSettings.timeControlSettings = {
                loseWhenTimeout: data.loseWhenTimeout!,
                startTime: data.startTime! * 1000,
                defaultTimeIncrease: data.defaultTimeIncrease! * 1000,
                fightTimeIncrease: data.fightTimeIncrease! * 1000
            };
        }

        await App.getInstance().gamesManager!.createGame(data.name, req.user, selectedUsers, gameSettings);

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

    if (
        game.players.find(p => p.id === req.user.id) === undefined
        && !game.settings
    ) {
        req.flash('error', 'Вы не можете присоединиться к данной игре.');
        return res.redirect('/');
    }

    if (game.status === GameStatus.FINISHED) {
        req.flash('error', 'Вы не можете присоединиться к данной игре.');
        return res.redirect('/');
    }

    return res.render('game/game');
};

export const showCreatePage = async (req: AuthenticatedRequest, res: Response) => {
    const users = await User.createQueryBuilder("user")
        .select(['id', 'login'])
        .getRawMany();

    return res.render('game/create', {
        users: users,
        defaultSettings,
        defaultTimeControlSettings
    });
}

export const showRules = async (req: Request, res: Response) => {
    return res.render('game/rules');
}

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

    return res.render('game/status', {
        game: {
            ...game,
            settings: game.settings,
            actions: new FileActionsStorage(game.logFilepath).getActionsWithStorageInfo(),
            isActive: App.getInstance().gamesManager!.isActive(game.id)
        }
    });
}

export const deleteGame = async (req: AuthenticatedGameRequest, res: Response) => {
    App.getInstance().gamesManager!.deactivateGame(req.params.gameId);

    await GameDBEntity.delete({
        id: req.params.gameId
    });

    return res.redirect('/');
}

export const deactivateGame = async (req: AuthenticatedGameRequest, res: Response) => {
    App.getInstance().gamesManager!.deactivateGame(req.params.gameId);
    return res.redirect('/');
}

export const deleteAllGames = async (req: Request, res: Response) => {
    const games = await GameDBEntity.find()

    for (const game of games) {
        App.getInstance().gamesManager!.deactivateGame(game.id);

        await GameDBEntity.delete({
            id: game.id
        });
    }

    return res.redirect('/');
}


export const createGame = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const users = await User.find();
        const gameSettings: GameSettings = {
            seed: String(Math.random()),
            ...defaultSettings,

            isDebug: true,
            isPublic: true,

            timeControlSettings: {
                loseWhenTimeout: true,
                startTime: 5 * 60 * 1000,
                defaultTimeIncrease: 40 * 1000,
                fightTimeIncrease: 5 * 1000
            }
        };

        const gameId = await App.getInstance().gamesManager!.createGame("Игра", req.user, users, gameSettings);

        return res.redirect(`/game/${gameId}`);
    } catch (err) {
        console.log(err);
        return res.redirect('/game/create');
    }
};