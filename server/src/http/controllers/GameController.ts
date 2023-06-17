import {Request, Response} from "express";
import App from "../../App";
import {User} from "../../entity/user";
import {AuthenticatedRequest} from "../middleware/auth";
import {arrayShuffle} from "../../game/GameData";
import {GameSettings, TimeControlSettings} from "../../../../common/GameForPlayerDTO";

export const create = async (req: Request, res: Response) => {
    try {
        let users = await User.find();

        let selectedUsers = req.body.players.map(id => {
            return users.find(u => u.id === parseInt(id));
        });

        if (selectedUsers.length < 2 || selectedUsers.length > 5)
            throw Error('Wrong users count on game creation');

        selectedUsers = arrayShuffle(selectedUsers);

        let withTimeControl = req.body['time-control'] === 'on';

        let gameSettings: GameSettings = {
            withTimeControl: withTimeControl,
            size: selectedUsers.length,
        };

        if (withTimeControl) {
            let defaultTimeIncrease = parseInt(req.body['default-time-increase']);
            defaultTimeIncrease = isNaN(defaultTimeIncrease) ? 45 : defaultTimeIncrease;

            let fightTimeIncrease = parseInt(req.body['fight-time-increase']);
            fightTimeIncrease = isNaN(fightTimeIncrease) ? 10 : fightTimeIncrease;

            gameSettings.timeControlSettings = {
                START_TIME: 5 * 60 * 1000,
                DEFAULT_TIME_INCREASE: defaultTimeIncrease * 1000,
                FIGHT_TIME_INCREASE: fightTimeIncrease * 1000
            };
        }

        App.getInstance().gamesManager.createGame(req.body.name, selectedUsers, gameSettings);

        return res.redirect('/');
    } catch (err) {
        return res.redirect('/game/create');
    }
};

export const joinGame = async (req: AuthenticatedRequest, res: Response) => {
    let gameId = req.url.split('/').pop();
    let game = App.getInstance().gamesManager.getGameById(gameId);

    if (!game || !game.players.find(p => p.id === req.user.id)) {
        return res.redirect('/');
    }

    res.render('game/game');
};

export const showCreatePage = async (req: Request, res: Response) => {
    let users = await User.createQueryBuilder("user")
        .select(['id', 'login'])
        .getRawMany();

    return res.render('game/create', {
        users: users
    });
}

export const showRules = async (req: Request, res: Response) => {
    return res.render('game/rules');
}
