import {Request, Response} from "express";
import App from "../../App";
import path from "path";

export const create = async (req: Request, res: Response) => {
    let playersCount: number = parseInt(req.query.count.toString());

    let createdGame = App.getInstance().gamesManager.createGame(playersCount);

    res.send(JSON.stringify(createdGame.getLinks()));
};

export const joinGame = async (req: Request, res: Response) => {
    if (!App.getInstance().gamesManager.checkPlayerLinkExist(parseInt(req.params.link))) {
        res.redirect("/");

        return;
    }

    res.sendFile(path.join(__dirname, '../../client/dist/html/game.html'));
};

export const check = async (req: Request, res: Response) => {
    res.send(App.getInstance().gamesManager.checkPlayerLinkExist(parseInt(req.params.link)));
};
