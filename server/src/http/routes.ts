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
    // @ts-expect-error handler takes an AuthenticatedRequest, which Express's RequestHandler does not provide
    router.get('/', auth, UserController.home);

    // @ts-expect-error handler takes an AuthenticatedRequest, which Express's RequestHandler does not provide
    router.get('/settings', auth, UserSettingsController.show);
    // @ts-expect-error handler takes an AuthenticatedRequest, which Express's RequestHandler does not provide
    router.post('/settings', auth, UserSettingsController.store);

    router.get('/user/:userId', UserController.showUserPage);

    router.get('/game/rules', GameController.showRules);
    // @ts-expect-error handler takes an AuthenticatedRequest, which Express's RequestHandler does not provide
    router.get('/game/create', auth, GameController.showCreatePage);
    // @ts-expect-error handler takes an AuthenticatedRequest, which Express's RequestHandler does not provide
    router.post('/game/create', auth, GameController.create);
    // @ts-expect-error handler takes an AuthenticatedRequest, which Express's RequestHandler does not provide
    router.get('/game/:gameId', auth, GameController.joinGame);
    // @ts-expect-error handler takes an AuthenticatedRequest, which Express's RequestHandler does not provide
    router.get('/game/:gameId/status', auth, gameOwner, GameController.showStatusPage);

    // @ts-expect-error handler takes an AuthenticatedRequest, which Express's RequestHandler does not provide
    router.post('/game/:gameId/delete', auth, gameOwner, GameController.deleteGame);
    // @ts-expect-error handler takes an AuthenticatedRequest, which Express's RequestHandler does not provide
    router.post('/game/:gameId/deactivate', auth, gameOwner, GameController.deactivateGame);

    router.get('/debug/deleteAllGames', GameController.deleteAllGames);
    // @ts-expect-error handler takes an AuthenticatedRequest, which Express's RequestHandler does not provide
    router.get('/debug/createGame', auth, GameController.createGame);

    return router;
}

function getApiRouter(): Router {
    const router = Router();

    router.use(express.json());

    router.post('/login', ApiUserController.login);
    router.post('/register', ApiUserController.register);

    // @ts-expect-error handler takes an AuthenticatedRequest, which Express's RequestHandler does not provide
    router.post('/game/create', auth, ApiGameController.create);
    router.post('/game/:id/logs', auth, ApiGameController.logs);

    return router;
}

export default function initRoutes(server: Express) {
    server.use(getUserRouter());
    server.use('/api/v1', getApiRouter());
}
