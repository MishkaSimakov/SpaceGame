import {NextFunction, Response} from "express";
import {AuthenticatedRequest} from "./auth";
import {Game as GameDBEntity} from "../../database/entity/game";

export type AuthenticatedGameRequest = AuthenticatedRequest & {
    params: {
        gameId: string
    }
};

function getGameId(params: string | string[]): string {
    if (typeof params === "string") {
        return params;
    }

    if (params.length !== 1) {
        throw new Error("Wrong path.");
    }

    return params[0];
}

export const gameOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!("gameId" in req.params)) {
        throw new Error("Game id is not specified in the request parameters.");
    }

    const gameId = getGameId(req.params.gameId);

    const game = await GameDBEntity.findOne({
        where: {
            id: gameId,
        },
        relations: {
            owner: true
        }
    });

    if (!game || game.owner.id !== req.user.id) {
        req.flash('error', 'Вы должны быть владельцем игры, чтобы посетить эту страницу.');
        return res.redirect('/');
    }

    next();
};
