import * as assert from "node:assert";
import jsonpatch from 'fast-json-patch'
import {ZodType} from "zod";

import {GameSettings, Player, GameState, PlayerId} from "@common/Types"
import {
    playerLost,
    reducerUpdatedState,
    shuffleResult,
    throwDiceResult,
    timeResult
} from "@common/Actions";
import * as Actions from "@common/Actions";
import {Action, constructAction, isAction} from "@common/ActionsHelpers";

import ActionsBus from "./ActionsBus";
import {getDTO} from "./mappers/GameToGameForPlayerMapper";
import {gameSaga} from "./sagas/Main";
import {isReducerName, reducers} from "./reducers/Main";
import {Randomizer} from "./Randomizer";
import {TimeControlMiddleware} from "./middlewares/TimeControlMiddleware";
import {validators} from "./validation/ResponseValidators";
import {validators as cheatsValidators} from "./validation/CheatsValidators";
import {PlayerGameLogListener} from "./PlayerGameLogListener";
import {getInitialGameState} from "./InitGameState";
import {runSagaWithThrowHandle} from "./sagas/runner/RunSaga";
import {IUser} from "@src/game/interfaces/IUser";
import {ISocketsManager} from "@src/game/interfaces/ISocketsManager";
import {IActionsStorage} from "@src/game/interfaces/IActionsStorage";
import {Observable} from "@common/Observable";
import {DeactivateSignal} from "@src/game/middlewares/DeactivateSignal";
import {LossSignal} from "@src/game/middlewares/LossSignal";
import {IClock} from "@src/game/interfaces/IClock";
import {cheatsPerformers} from "@src/game/CheatsPerformers";


export type GameResult = { type: "deactivated" } | { type: "finished", winner: PlayerId };

export default class Game {
    users: IUser[];

    randomizer: Randomizer;
    state: GameState;
    bus: ActionsBus;
    sockets: ISocketsManager;
    storage: IActionsStorage;
    playerGameLog: PlayerGameLogListener;

    clock: IClock;

    private inReplay: boolean = false;
    private throwHandle = new Observable<any>(undefined);

    constructor(
        users: IUser[],
        settings: GameSettings,
        sockets: ISocketsManager,
        storage: IActionsStorage,
        clock: IClock
    ) {
        this.users = users;

        this.state = getInitialGameState(users, settings);

        this.randomizer = new Randomizer(settings.seed);
        this.bus = new ActionsBus();
        this.sockets = sockets;
        this.storage = storage;
        this.clock = clock;

        this.playerGameLog = new PlayerGameLogListener(this.bus, this.users);

        this.playerGameLog.registerListeners();
        this.registerReduceListeners();
        this.registerLogListeners();
        this.registerRandomizerListeners();
        this.registerIOListeners();
        this.registerTimeListeners();

        this.registerMiddlewares();

        // this listener must be performed after reducer!
        // reducers are attached to actions bus as * listeners
        // they are executed after all non-* listeners have finished
        // therefore this listener must be * listener
        this.bus.on('*', (action) => {
            if (action.type === "playerLost") {
                const payload = action.payload as ReturnType<typeof playerLost>["payload"];
                this.throwHandle.set(new LossSignal(payload.player));

                // TODO: do not send this via bus, just call some game method
                // this.bus.emit(sendPlayerLostInfo(payload.player));
            }
        });
    }

    async activate(): Promise<GameResult> {
        await this.replay(this.storage.getAllActions());

        try {
            await runSagaWithThrowHandle({bus: this.bus, state: this.state}, this.throwHandle, gameSaga);
        } catch (error) {
            if (error instanceof DeactivateSignal) {
                return {type: "deactivated"};
            } else {
                throw error;
            }
        }

        // game has finished
        // notify players about it
        for (let player of this.state.players) {
            await this.sockets.emit(player.id, {
                withAcknowledgement: false,
                ensureSending: false
            }, 'gameFinished');
        }

        this.sockets.disconnectEveryone();

        return {
            type: "finished",
            winner: this.state.players.filter(p => !p.lose)[0].id
        };
    }

    private async replay(actions: Action<string, any, any>[]) {
        if (actions.length === 0) {
            return;
        }

        this.inReplay = true;

        const returnToNormalExecution = (pendingAction?: Action<string, any, any>) => {
            console.log("⏪ replay finished, returning to normal execution");

            this.bus.off('*', actionsReplayListener);
            this.inReplay = false;

            this.syncPlayersData();

            // game.bus.emit(Actions.insertPause());

            if (pendingAction) {
                // if (pendingAction.type === "time") {
                //     game.
                // } else {
                // type is *Request
                this.sendSocketRequest(pendingAction);
                // }
            }
        };

        // register fake sockets listeners
        // they don't send anything to users and read responses from the log file
        const actionsReplayListener = (action: Action<string, any, any>) => {
            const pastAction = actions.shift();
            if (!pastAction) {
                return;
            }

            if (pastAction.type !== action.type) {
                throw new Error(`Error during game replay: unexpected action type (in a log file ${pastAction.type} (${pastAction.uuid}), received ${action.type} (${action.uuid})). This is possibly due to changes in gameSaga code.`);
            }

            if (action.type.endsWith("Request") || action.type === "time") {
                if (actions.length === 0) {
                    returnToNormalExecution(action);
                    return;
                }

                this.bus.emit(actions[0]);
            } else if (actions.length === 0) {
                returnToNormalExecution();
            }
        };

        this.bus.on('*', actionsReplayListener);
    }

    registerMiddlewares() {
        const loss = new TimeControlMiddleware(this.state, this.clock, this.throwHandle);
        this.bus.registerMiddleware(loss);
    }

    registerLogListeners() {
        this.bus.on('*', (action) => {
            if (!this.inReplay) {
                this.storage.appendAction(action);
            }
        });
    }

    registerRandomizerListeners() {
        this.bus.on('throwDice', () => {
            this.bus.emit(throwDiceResult(this.randomizer.dice()));
        });

        this.bus.on('shuffle', (action) => {
            const result = new Array(action.payload.length);
            for (let i = 0; i < action.payload.length; ++i) {
                result[i] = i;
            }

            this.randomizer.shuffle(result)
            this.bus.emit(shuffleResult(result));
        });
    }

    registerIOListeners() {
        this.bus.on('*', action => {
            if (this.inReplay) {
                return;
            }

            // actions that match `*Request` are broadcasted through sockets
            // they must contain payload.player field, the field specify to which player
            // the action is broadcasted.

            // actions that match `*Info` are also broadcasted in the same way,
            // but without an acknowledgment

            if (action.type.endsWith("Request")) {
                this.sendSocketRequest(action);
            }

            if (action.type.endsWith("Info")) {
                assert.ok("player" in action.payload);

                this.sockets.emit(action.payload.player, {
                    withAcknowledgement: false,
                    ensureSending: true
                }, action.type, action.payload);
            }
        });

        // cheats listeners
        for (const cheatName of Object.keys(Actions).filter(a => a.startsWith('cheat'))) {
            this.sockets.on(cheatName, (payload: any) => {
                const validator = cheatsValidators[cheatName as keyof typeof cheatsValidators] as (state: GameState) => ZodType;
                const validationResult = validator(structuredClone(this.state)).safeParse(payload);

                console.log(validationResult, payload);
                if (validationResult.error) {
                    return;
                }

                (cheatsPerformers[cheatName as keyof typeof cheatsPerformers] as any)(validationResult.data, structuredClone(this.state), this.bus)
                    .then(() => {
                        this.syncPlayersData();
                    });
            });
        }
    }

    registerReduceListeners() {
        this.bus.on('*', (action) => {
            if (isReducerName(action.type)) {
                let copy = structuredClone(this.state);
                // TODO: strict typying
                // @ts-ignore
                reducers[action.type](copy, action.payload);

                const delta = jsonpatch.compare(this.state, copy);

                // SagaRunner relies on stateRef. Plain assignment would invalidate its reference
                Object.assign(this.state, copy);

                // for the sake of logging
                this.bus.emit(reducerUpdatedState(delta));
            }
        });
    }

    registerTimeListeners() {
        this.bus.on('time', () => {
            if (!this.inReplay) {
                this.bus.emit(timeResult(this.clock.getTime()));
            }
        });
    }

    getPlayerById(id: number): Player {
        return this.state.players.filter(p => p.id === id)[0];
    }

    syncPlayersData() {
        console.log("🔄 syncing player data");

        for (let player of this.state.players) {
            this.sockets.emit(player.id, {
                withAcknowledgement: false,
                ensureSending: false
            }, 'setGameData', getDTO(this, player));
        }
    }

    private sendSocketRequest(request: Action<string, any, any>) {
        this.syncPlayersData();

        const responseType = request.type.replace("Request", "Response");

        assert.ok("player" in request.payload);
        assert.ok(responseType in Actions);

        let currentAttempt = 0;
        const requestAttempt = (errors: string[]) => {
            ++currentAttempt;

            this.sockets.emit(request.payload.player, {
                withAcknowledgement: true,
                ensureSending: true
            }, request.type, {...request.payload, errors})
                .then((response: any) => {
                    if (!isAction(response)) {
                        return requestAttempt(["Ответ должен быть в формате действия."]);
                    }

                    try {
                        const validator = validators[responseType as keyof typeof validators] as (state: GameState, request: unknown) => ZodType;
                        const validationResult = validator(structuredClone(this.state), request).safeParse(response.payload);

                        if (validationResult.error) {
                            return requestAttempt(validationResult.error.issues.map(issue => issue.message));
                        }

                        // action comes from a user, payload is validated, but time and uuid are untrusted
                        const responseAction = constructAction(responseType, response.payload);
                        this.bus.emit(responseAction);
                    } catch (err) {
                        console.error(err);
                        return requestAttempt(["Произошла ошибка при валидации вашего ответа."]);
                    }
                });
        };

        requestAttempt([]);
    }

    deactivate() {
        // this will eventually deactivate the game
        this.throwHandle.set(new DeactivateSignal());
    }

    onPlayerConnect(id: PlayerId, socket_id: string) {
        this.sockets.onPlayerConnect(id, socket_id);
        this.syncPlayersData();
        this.sockets.tryToEmitEvent(id);
    }

    onPlayerDisconnect(id: PlayerId) {
        this.sockets.onPlayerDisconnect(id);
        this.syncPlayersData();
    }
}
