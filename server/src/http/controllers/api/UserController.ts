import {Request, Response} from "express";
import {User} from "../../../database/entity/user";
import bcrypt from "bcrypt";
import {defaultUserSettings} from "@common/UserSettings";

export const login = async (req: Request, res: Response) => {
    try {
        const name = req.body.name;
        const password = req.body.password;

        if (!name || !password) {
            return res.status(400).json({error: '`name` & `password` must be provided in JSON'});
        }

        const user = await User.findOneBy({
            login: name
        });

        if (!user) {
            return res.status(400).json({error: `wrong name or password`});
        }

        const match = await bcrypt.compare(req.body.password, user.password);

        if (!match) {
            return res.status(400).json({error: `wrong name or password`});
        }

        const token = user.generateToken();

        return res.json({token});
    } catch (error) {
        return res.status(500).send({error});
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const name = req.body.name;
        const password = req.body.password;

        if (!name || !password) {
            return res.status(400).json({error: '`name` & `password` must be provided in JSON'});
        }

        const existUserWithSameName = await User.createQueryBuilder().where({
            login: name
        }).getExists();

        if (existUserWithSameName) {
            return res.status(400).json({error: `name \`${name}\` is already taken`});
        }

        const user = new User();

        user.login = name;
        user.password = await User.createHashedPassword(password);
        user.isBot = true;
        user.settings = defaultUserSettings;

        await user.save();

        const token = user.generateToken();

        return res.json({token});
    } catch (error) {
        return res.status(500).send({error});
    }
};