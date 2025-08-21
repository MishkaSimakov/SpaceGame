import {Request, Response} from "express";

import {GameSettings} from "@common/Types";

import App from "../../App";
import {User} from "../../database/entity/user";
import {AuthenticatedRequest} from "../middleware/auth";
import {AuthenticatedGameRequest} from "../middleware/GameOwner";
import {Game as GameDBEntity, GameStatus} from "../../database/entity/game";
import {Logger} from "../../game/Logger";
import {gamePlayersValidator} from "../validation/GamePlayersValidator";
import {defaultSettings} from "../../game/DefaultSettings";

export const create = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const users = await User.find();

        // Define a zod schema for an array of integers (string numbers converted to integers)
        const result = gamePlayersValidator(users).safeParse(req.body.players);
        if (result.error) {
            // TODO: display zod error
            req.flash('error', 'Что-то не так с выбранными игроками.');
            return res.redirect('/');
        }

        const selectedUsers = result.data.map(id => {
            return users.find(u => u.id === id)!;
        });

        const withTimeControl = req.body['time-control'] === 'on';

        const gameSettings: GameSettings = {
            seed: String(Math.random()),
            ...defaultSettings
        };

        if (withTimeControl) {
            let startTime = parseInt(req.body['start-time']);
            startTime = isNaN(startTime) ? 300 : startTime;

            let defaultTimeIncrease = parseInt(req.body['default-time-increase']);
            defaultTimeIncrease = isNaN(defaultTimeIncrease) ? 45 : defaultTimeIncrease;

            let fightTimeIncrease = parseInt(req.body['fight-time-increase']);
            fightTimeIncrease = isNaN(fightTimeIncrease) ? 10 : fightTimeIncrease;

            gameSettings.timeControlSettings = {
                loseWhenTimeout: req.body['lose-when-timeout'] === 'on',
                startTime: startTime * 1000,
                defaultTimeIncrease: defaultTimeIncrease * 1000,
                fightTimeIncrease: fightTimeIncrease * 1000
            };
        }

        await App.getInstance().gamesManager!.createGame(req.body.name, req.user, selectedUsers, gameSettings);

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

    if (game.status !== GameStatus.ACTIVE) {
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
        users: users
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
            actions: new Logger(game.logFilepath).getPastActions(),
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