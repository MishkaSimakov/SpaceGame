import {Request, Response} from "express";
import {User} from "../../../entity/user";
import {GameSettings} from "@common/GameSettings";
import App from "../../../App";
import {Game as GameDBEntity} from "../../../entity/game";
import {Logger} from "../../../game/Logger";
import {AuthenticatedRequest} from "../../middleware/auth";


export const create = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const usersIds = req.body.users;
        const settings = req.body.settings as GameSettings;
        const name = req.body.name;

        if (!Array.isArray(usersIds) || !usersIds.every(n => Number.isInteger(n))) {
            return res.status(400).json({error: "'users' must be an array of integers"});
        }

        const users = await User.find();
        const selectedUsers = usersIds.map(id => {
            return users.find(u => u.id === parseInt(id));
        });

        if (selectedUsers.some(u => !u)) {
            return res.status(400).json({error: "one of users ids is invalid"});
        }

        const gameId = await App.getInstance().gamesManager.createGame(name, req.user, selectedUsers, settings);

        return res.json({gameId: gameId});
    } catch (error) {
        return res.status(500).send({error});
    }
};

export const logs = async (req: Request, res: Response) => {
    const parts = req.url.split('/');
    const gameId = parts[parts.length - 2];

    const gameEntity = await GameDBEntity.findOneBy({id: gameId});

    if (!gameEntity) {
        return res.status(500).send({error: "Failed to find game with the given id"});
    }

    return res.status(200).json(
        new Logger(gameEntity.logFilepath).getPastActions()
    );
};