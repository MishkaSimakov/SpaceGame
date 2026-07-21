import * as assert from "node:assert";

import {Request, Response} from "express";
import {User} from "@src/database/entity/user";
import bcrypt from "bcrypt";
import {AuthenticatedRequest} from "../middleware/auth";
import {render} from "@src/helpers/Render";
import {defaultUserSettings} from "@common/UserSettings";

export const login = async (req: Request, res: Response) => {
    const user = await User.findOneBy({
        login: req.body.login
    });

    if (!user) {
        req.flash('error', 'Неправильный логин или пароль.');
        return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);

    if (!isMatch) {
        req.flash('error', 'Неправильный логин или пароль.');
        return res.redirect('/login');
    }

    const token = user.generateToken();

    return res.cookie('authentication_token', token, {
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
    }).redirect('/');
};

export const register = async (req: Request, res: Response) => {
    try {
        const existUserWithSameName = await User.createQueryBuilder().where({
            login: req.body.login
        }).getExists();

        if (existUserWithSameName) {
            return res.redirect('/register');
        }

        const user = new User();

        user.login = req.body.login;
        user.password = await User.createHashedPassword(req.body.password);
        user.isBot = false;
        user.settings = defaultUserSettings;

        await user.save();

        const token = user.generateToken();

        return res.cookie('authentication_token', token, {
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
        }).redirect('/');
    } catch {
        return res.status(500).send('Something went wrong.');
    }
};

export const home = async (req: AuthenticatedRequest, res: Response) => {
    // TODO: return only current player games
    const user = await User.findOne({
        where: {
            id: req.user.id,
        },
        relations: {
            games: {
                winner: true,
                players: true,
                owner: true,
            }
        }
    });

    if (!user) {
        throw new Error("Failed to find user in DB");
    }

    render(res, 'home', {
        games: user.games
            .filter(g => !g.finishedAt)
            .map(game => {
                return {
                    id: game.id,
                    name: game.name,
                    players: game.players.map(p => ({id: p.id, login: p.login})),
                    owner: {
                        id: game.owner.id,
                        login: game.owner.login
                    }
                };
            }),
        archivedGames: user.games
            .filter(g => g.finishedAt)
            .map(game => {
                assert.ok(game.winner);
                return {
                    id: game.id,
                    name: game.name,
                    winner: {
                        id: game.winner.id,
                        login: game.winner.login
                    },
                    players: game.players.map(p => {
                        return {
                            id: p.id,
                            login: p.login
                        };
                    })
                };
            }),
        error: req.flash('error')
    });
};

export const showLoginPage = (req: Request, res: Response) => {
    render(res, 'auth/login');
};

export const showRegisterPage = (req: Request, res: Response) => {
    render(res, 'auth/register');
};

export const showUserPage = async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);

    if (Number.isNaN(userId)) {
        return res.status(404).render('error', {
            code: 404
        });
    }

    const user = await User.findOne({
        where: {
            id: userId,
        },
        relations: {
            games: {
                winner: true,
                players: true
            }
        }
    });

    if (!user) {
        return res.status(404).render('error', {
            code: 404
        });
    }

    render(res, 'user', {
        archivedGames: user.games
            .filter(game => game.isFinished())
            .map(game => {
                return {
                    id: game.id,
                    name: game.name,
                    winner: {
                        id: game.winner?.id,
                        login: game.winner?.login
                    },
                    players: game.players.map(p => {
                        return {
                            id: p.id,
                            login: p.login
                        };
                    })
                };
            })
    });
};
