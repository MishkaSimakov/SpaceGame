import express, {Express, Router} from "express";
import {auth} from "./middleware/auth";

import * as UserController from './controllers/UserController';
import * as GameController from './controllers/GameController';

import * as ApiUserController from './controllers/api/UserController';
import * as ApiGameController from './controllers/api/GameController';
import {gameOwner} from "./middleware/GameOwner";

function getUserRouter(): Router {
    const router = Router();

    router.get('/login', UserController.showLoginPage);
    router.get('/register', UserController.showRegisterPage);

    router.post('/login', UserController.login);
    router.post('/register', UserController.register);
    router.get('/', auth, UserController.home);

    router.get('/user/:userId', UserController.showUserPage);

    router.get('/game/rules', GameController.showRules);
    router.get('/game/create', auth, GameController.showCreatePage);
    router.post('/game/create', auth, GameController.create);
    router.get('/game/:gameId', auth, GameController.joinGame);
    router.get('/game/:gameId/status', auth, gameOwner, GameController.showStatusPage);

    return router;
}

function getApiRouter(): Router {
    const router = Router();

    router.use(express.json());

    router.post('/login', ApiUserController.login);
    router.post('/register', ApiUserController.register);

    router.post('/game/create', ApiGameController.create);
    router.post('/game/:id/logs', ApiGameController.logs);

    return router;
}

export default function initRoutes(server: Express) {
    server.use(getUserRouter());
    server.use('/api/v1', getApiRouter());
}
