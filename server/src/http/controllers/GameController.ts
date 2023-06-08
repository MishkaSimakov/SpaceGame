import {Request, Response} from "express";
import App from "../../App";
import path from "path";
import {User} from "../../entity/user";

export const create = async (req: Request, res: Response) => {
    let createdGame = App.getInstance().gamesManager.createGame(req.body.name, {
        withTimeControl: true,
        size: 3
    });

    res.send(JSON.stringify(createdGame.getLinks()));
};

export const joinGame = async (req: Request, res: Response) => {
    if (!App.getInstance().gamesManager.checkPlayerLinkExist(parseInt(req.params.link))) {
        res.redirect("/");

        return;
    }

    res.sendFile(path.join(__dirname, '../../client/dist/html/game.edge'));
};

export const showCreatePage = async (req: Request, res: Response) => {
    let users = await User.createQueryBuilder("user")
        .select(['id', 'login'])
        .getRawMany();

    return res.render('game/create', {
        users: users
    });
}

export const check = async (req: Request, res: Response) => {
    res.send(App.getInstance().gamesManager.checkPlayerLinkExist(parseInt(req.params.link)));
};
