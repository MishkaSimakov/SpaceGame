import {Request, Response} from "express";

import {GameSettings} from "@common/Types";

import {User} from "../../../database/entity/user";
import App from "../../../App";
import {Game as GameDBEntity} from "../../../database/entity/game";
import {AuthenticatedRequest} from "../../middleware/auth";
import {gamePlayersValidator} from "../../validation/GamePlayersValidator";
import {FileActionsStorage} from "@src/game/FileActionsStorage";


export const create = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const users = await User.find();

        const settings = req.body.settings as GameSettings;
        const name = req.body.name;

        const result = gamePlayersValidator(users).safeParse(req.body.players);
        if (result.error) {
            return res.status(400).json({error: "wrong 'users' value"});
        }

        const selectedUsers = result.data.map(id => {
            return users.find(u => u.id === id)!;
        });

        const gameId = await App.getInstance().gamesManager!.createGame(name, req.user, selectedUsers, settings);

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
        new FileActionsStorage(gameEntity.logFilepath).getAllActions()
    );
};