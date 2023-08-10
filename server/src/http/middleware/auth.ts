import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import {User} from "../../entity/user";
import {UserJWTPayload} from "../controllers/UserController";

export interface AuthenticatedRequest extends Request {
    user: User;
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.authentication_token;

        if (!token) {
            throw new Error("token not found");
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY) as UserJWTPayload;

        let user = await User.findOneBy({
            id: parseInt(decoded._id)
        });

        (req as AuthenticatedRequest).user = user;

        next();
    } catch (err) {
        console.error(err);
        res.redirect('/login');
    }
};
