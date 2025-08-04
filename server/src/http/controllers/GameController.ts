import {Request, Response} from "express";
import App from "../../App";
import {User} from "../../entity/user";
import {AuthenticatedRequest} from "../middleware/auth";
import {GameSettings} from "@common/GameSettings";

export const create = async (req: Request, res: Response) => {
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
            let defaultTimeIncrease = parseInt(req.body['default-time-increase']);
            defaultTimeIncrease = isNaN(defaultTimeIncrease) ? 45 : defaultTimeIncrease;

            let fightTimeIncrease = parseInt(req.body['fight-time-increase']);
            fightTimeIncrease = isNaN(fightTimeIncrease) ? 10 : fightTimeIncrease;

            gameSettings.timeControlSettings = {
                startTime: 5 * 60 * 1000,
                defaultTimeIncrease: defaultTimeIncrease * 1000,
                fightTimeIncrease: fightTimeIncrease * 1000
            };
        }

        gameSettings.seed = "abracadabra";

        await App.getInstance().gamesManager.createGame(req.body.name, selectedUsers, gameSettings);

        return res.redirect('/');
    } catch (err) {
        console.log(err);
        return res.redirect('/game/create');
    }
};

export const joinGame = async (req: AuthenticatedRequest, res: Response) => {
    const gameId = req.url.split('/').pop();
    const game = await App.getInstance().gamesManager.getGame(gameId);

    const isPlayerInGame = !!game?.users.find(p => p.id === req.user.id);
    if (!game || !(isPlayerInGame || game.state.settings.isPublic)) {
        return res.redirect('/');
    }

    res.render('game/game');
};

export const showCreatePage = async (req: Request, res: Response) => {
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
