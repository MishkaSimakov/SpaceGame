import {Request, Response} from "express";
import {User} from "../../entity/user";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import App from "../../App";

const HOME = '/';

export const login = async (req: Request, res: Response) => {
    try {
        let user = await User.findOneBy({
            login: req.body.login
        });

        const isMatch = await bcrypt.compare(req.body.password, user.password);

        if (!isMatch) {
            throw new Error('Password is not correct');
        }

        const SECRET_KEY = process.env.JWT_SECRET_KEY;
        const token = jwt.sign({_id: user.id?.toString(), login: user.login}, SECRET_KEY, {
            expiresIn: '1 year',
        });

        return res.status(200).send({user: {id: user.id, login: user.login}, token: token});
    } catch (error) {
        console.log(error);
        return res.status(500).send('Something went wrong.');
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        let user = new User();

        user.login = req.body.login;
        user.password = req.body.password;

        await user.save();

        res.status(200).send('Inserted successfully');
    } catch (error) {
        console.log(error);
        return res.status(500).send('Something went wrong.');
    }
};

let getStaticPath = (staticPath: string): string => {
    return path.join(App.getInstance().serverManager.staticBasePath, staticPath);
}

export const home = async (req: Request, res: Response) => {
    res.sendFile(getStaticPath('/html/index.html'));
};

export const showLoginPage = async (req: Request, res: Response) => {
    res.sendFile(getStaticPath('/html/login.html'));
};

export const showRegisterPage = async (req: Request, res: Response) => {
    res.sendFile(getStaticPath('/html/register.html'));
};
