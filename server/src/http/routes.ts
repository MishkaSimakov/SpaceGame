import {Express} from "express";
import {auth} from "./middleware/auth";

import * as UserController from './controllers/UserController';
import * as GameController from './controllers/GameController';

export default function initRoutes(server: Express) {
    server.get('/login', UserController.showLoginPage);
    server.get('/register', UserController.showRegisterPage);

    server.post('/login', UserController.login);
    server.post('/register', UserController.register);
    server.get('/', auth, UserController.home);

    server.get('/game/create', auth, GameController.showCreatePage);
    server.post('/game/create', auth, GameController.create);
    server.get('/game/:id', auth, GameController.joinGame);
}
