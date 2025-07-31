import {Request, Response} from "express";
import {User} from "../../entity/user";
import bcrypt from "bcrypt";
import jwt, {JwtPayload} from "jsonwebtoken";
import path from "path";
import App from "../../App";
import {AuthenticatedRequest} from "../middleware/auth";
import {Game} from "../../entity/game";

const HOME = '/';

export const login = async (req: Request, res: Response) => {
    try {
        let user = await User.findOneBy({
            login: req.body.login
        });

        if (!user) {
            throw new Error('user dont exist');
        }

        const isMatch = await bcrypt.compare(req.body.password, user.password);

        if (!isMatch) {
            throw new Error('Password is not correct');
        }

        let token = user.generateToken();

        return res.cookie('authentication_token', token, {
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
        }).redirect(HOME);
    } catch (error) {
        console.error(error);

        return res.redirect('/login');
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        let existUserWithSameName = await User.createQueryBuilder().where({
            login: req.body.login
        }).getExists();

        if (existUserWithSameName) {
            return res.redirect('/register')
        }

        let user = new User();

        user.login = req.body.login;
        user.password = await User.createHashedPassword(req.body.password);
        user.isBot = false;

        await user.save();

        const token = user.generateToken();

        return res.cookie('authentication_token', token, {
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)
        }).redirect(HOME);
    } catch (error) {
        return res.status(500).send('Something went wrong.');
    }
};

let getStaticPath = (staticPath: string): string => {
    return path.join(App.getInstance().serverManager.staticBasePath, staticPath);
}

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
            }
        }
    });

    if (!user) {
        throw new Error("Failed to find user in DB");
    }

    res.render('home', {
        user: {
            id: user.id,
            login: user.login
        },
        games: user.games
            .filter(g => !g.finishedAt)
            .map(game => {
                return {
                    id: game.id,
                    name: game.name,
                    players: game.players.map(p => p.login),
                };
            }),
        archivedGames: user.games
            .filter(g => g.finishedAt)
            .map(game => {
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
            })
    });
};

export const showLoginPage = async (req: Request, res: Response) => {
    res.render('auth/login');
};

export const showRegisterPage = async (req: Request, res: Response) => {
    res.render('auth/register');
};

export const showUserPage = async (req: Request, res: Response) => {
    const userId = parseInt(req.url.split('/').pop());
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

    res.render('user', {
        user: {
            id: user.id,
            login: user.login
        },
        archivedGames: user.games?.map(game => {
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
        }) || []
    });
}
