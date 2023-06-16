import jwt, {Jwt, JwtPayload} from 'jsonwebtoken';
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
            throw new Error();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY) as UserJWTPayload;

        let user = await User.findOneBy({
            id: parseInt(decoded._id)
        });

        if (!user || user.rememberToken !== token) {
            throw new Error();
        }

        (req as AuthenticatedRequest).user = user;

        next();
    } catch (err) {
        res.redirect('/login');
    }
};
