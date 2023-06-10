import {Request, Response} from "express";
import App from "../../App";
import {User} from "../../entity/user";
import {AuthenticatedRequest} from "../middleware/auth";
import {arrayShuffle} from "../../game/GameData";

export const create = async (req: Request, res: Response) => {
    let users = await User.find();

    let selectedUsers = req.body.players.map(id => {
        return users.find(u => u.id === parseInt(id));
    });

    selectedUsers = arrayShuffle(selectedUsers);

    let createdGame = App.getInstance().gamesManager.createGame(req.body.name,  selectedUsers,{
        withTimeControl: true,
        size: selectedUsers.length
    });

    return res.redirect('/');
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
