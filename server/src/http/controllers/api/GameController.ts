import {Request, Response} from "express";
import {User} from "../../../entity/user";
import {GameSettings} from "@common/GameSettings";
import App from "../../../App";


export const create = async (req: Request, res: Response) => {
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

        const gameId = await App.getInstance().gamesManager.createGame(name, selectedUsers, settings);

        return res.json({gameId: gameId});
    } catch (error) {
        return res.status(500).send({error});
    }
};

export const logs = async (req: Request, res: Response) => {
    return res.json({
        error: "not implemented"
    });
};