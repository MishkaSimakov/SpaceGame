import express, {Express, Router} from "express";
import {auth} from "./middleware/auth";

import * as UserController from './controllers/UserController';
import * as GameController from './controllers/GameController';
import * as UserSettingsController from './controllers/UserSettingsController';

import * as ApiUserController from './controllers/api/UserController';
import * as ApiGameController from './controllers/api/GameController';
import {gameOwner} from "./middleware/GameOwner";

// TODO: strict typing
function getUserRouter(): Router {
    const router = Router();

    router.get('/login', UserController.showLoginPage);
    router.get('/register', UserController.showRegisterPage);

    router.post('/login', UserController.login);
    router.post('/register', UserController.register);
    // @ts-ignore
    router.get('/', auth, UserController.home);

    // @ts-ignore
    router.get('/settings', auth, UserSettingsController.show);
    // @ts-ignore
    router.post('/settings', auth, UserSettingsController.store);

    router.get('/user/:userId', UserController.showUserPage);

    router.get('/game/rules', GameController.showRules);
    // @ts-ignore
    router.get('/game/create', auth, GameController.showCreatePage);
    // @ts-ignore
    router.post('/game/create', auth, GameController.create);
    // @ts-ignore
    router.get('/game/:gameId', auth, GameController.joinGame);
    // @ts-ignore
    router.get('/game/:gameId/status', auth, gameOwner, GameController.showStatusPage);

    // @ts-ignore
    router.post('/game/:gameId/delete', auth, gameOwner, GameController.deleteGame);
    // @ts-ignore
    router.post('/game/:gameId/deactivate', auth, gameOwner, GameController.deactivateGame);

    router.get('/debug/deleteAllGames', GameController.deleteAllGames);
    // @ts-ignore
    router.get('/debug/createGame', auth, GameController.createGame);

    return router;
}

function getApiRouter(): Router {
    const router = Router();

    router.use(express.json());

    router.post('/login', ApiUserController.login);
    router.post('/register', ApiUserController.register);

    // @ts-ignore
    router.post('/game/create', auth, ApiGameController.create);
    router.post('/game/:id/logs', auth, ApiGameController.logs);

    return router;
}

export default function initRoutes(server: Express) {
    server.use(getUserRouter());
    server.use('/api/v1', getApiRouter());
}
