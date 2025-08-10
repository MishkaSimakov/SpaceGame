import {Request, Response} from "express";
import App from "../../App";
import {User} from "../../entity/user";
import {AuthenticatedRequest} from "../middleware/auth";
import {GameSettings} from "@common/GameSettings";
import {AuthenticatedGameRequest} from "../middleware/GameOwner";
import {Game as GameDBEntity} from "../../entity/game";
import {Logger} from "../../game/Logger";
import {Action} from "@common/actions/Action";

export const create = async (req: AuthenticatedRequest, res: Response) => {
    try {
        let users = await User.find();

        let selectedUsers = req.body.players.map(id => {
            return users.find(u => u.id === parseInt(id));
        });

        if (selectedUsers.length < 2 || selectedUsers.length > 5)
            throw Error('Wrong users count on game creation');

        let withTimeControl = req.body['time-control'] === 'on';

        let gameSettings = new GameSettings();

        gameSettings.withTimeControl = withTimeControl;
        gameSettings.size = selectedUsers.length;
        gameSettings.loseWhenTimeout = req.body['lose-when-timeout'] === 'on' && withTimeControl;
        gameSettings.isPublic = req.body['is-public'] === 'on';

        if (withTimeControl) {
            let startTime = parseInt(req.body['start-time']);
            startTime = isNaN(startTime) ? 300 : startTime;

            let defaultTimeIncrease = parseInt(req.body['default-time-increase']);
            defaultTimeIncrease = isNaN(defaultTimeIncrease) ? 45 : defaultTimeIncrease;

            let fightTimeIncrease = parseInt(req.body['fight-time-increase']);
            fightTimeIncrease = isNaN(fightTimeIncrease) ? 10 : fightTimeIncrease;

            gameSettings.timeControlSettings = {
                startTime: startTime * 1000,
                defaultTimeIncrease: defaultTimeIncrease * 1000,
                fightTimeIncrease: fightTimeIncrease * 1000
            };
        }

        gameSettings.seed = String(Math.random());

        await App.getInstance().gamesManager.createGame(req.body.name, req.user, selectedUsers, gameSettings);

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
        && !game.settings.isPublic
    ) {
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

    let pastActions: Action<string, any, any>[];
    let error: string = "";
    try {
        pastActions = new Logger(game.logFilepath).getPastActions()
    } catch (err) {
        console.error(err);

        pastActions = [];
        error = "Не удалось загрузить файл с логами.";
    }

    return res.render('game/status', {
        game: {
            ...game,
            settings: game.settings,
            actions: pastActions,
            isActive: App.getInstance().gamesManager.isActive(game.id)
        },
        error: error.length !== 0 ? [error] : []
    });
}

export const deleteGame = async (req: AuthenticatedGameRequest, res: Response) => {
    App.getInstance().gamesManager.deactivateGame(req.params.gameId);

    await GameDBEntity.delete({
        id: req.params.gameId
    });

    return res.redirect('/');
}

export const deactivateGame = async (req: AuthenticatedGameRequest, res: Response) => {
    App.getInstance().gamesManager.deactivateGame(req.params.gameId);
    return res.redirect('/');
}