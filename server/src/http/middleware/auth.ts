import jwt from 'jsonwebtoken';
import {Request, Response, NextFunction} from 'express';
import {User, UserJWTPayload} from "../../database/entity/user";
import * as assert from "node:assert";

export interface AuthenticatedRequest extends Request {
    user: User;
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.authentication_token;

    if (!token) {
        res.redirect('/login');
        return;
    }

    assert.ok(process.env.JWT_SECRET_KEY, "Secret token must be set in .env file.");
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY) as unknown as UserJWTPayload;

    let user = await User.findOneBy({
        id: parseInt(decoded._id)
    });

    if (user == null) {
        res.redirect('/login');
        return;
    }

    (req as AuthenticatedRequest).user = user;

    next();
};
