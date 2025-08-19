import {NextFunction, Response} from "express";
import {AuthenticatedRequest} from "./auth";
import {Game as GameDBEntity} from "../../database/entity/game";

export type AuthenticatedGameRequest = AuthenticatedRequest & {
    params: {
        gameId: string
    }
};

export const gameOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const gameId: string = req.params.gameId;

    if (!gameId) {
        req.flash('error', 'Что-то пошло не так!');
        return res.redirect('/');
    }

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
