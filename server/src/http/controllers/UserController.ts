import {Request, Response} from "express";
import {User} from "../../entity/user";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import App from "../../App";
import {AuthenticatedRequest} from "../middleware/auth";

const HOME = '/';

let generateToken = (user: User): string => {
    const SECRET_KEY = process.env.JWT_SECRET_KEY;
    return jwt.sign({_id: user.id?.toString(), login: user.login}, SECRET_KEY, {
        expiresIn: '1 year',
    });
}

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

        let token = generateToken(user);

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
        user.password = req.body.password;

        await user.save();

        let token = generateToken(user);

        return res.cookie('authentication_token', token).redirect(HOME);
    } catch (error) {
        console.log(error);
        return res.status(500).send('Something went wrong.');
    }
};

let getStaticPath = (staticPath: string): string => {
    return path.join(App.getInstance().serverManager.staticBasePath, staticPath);
}

export const home = async (req: AuthenticatedRequest, res: Response) => {
    let games = App.getInstance().gamesManager.getGamesOfUser(req.user);

    res.render('home', {
        user: req.user,
        games: games.map(game => {
            return {
                id: game.id,
                name: game.name,
                players: game.players.map(p => p.name)
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
