import * as assert from "node:assert";
import jsonpatch from 'fast-json-patch'
import {ZodType} from "zod";

import {GameSettings, GameState, Player, PlayerId} from "@common/Types"
import * as Actions from "@common/Actions";
import {reducerUpdatedState, shuffleResult, throwDiceResult, timeResult} from "@common/Actions";
import {Action, constructAction, isAction} from "@common/ActionsHelpers";

import ActionsBus from "./ActionsBus";
import {getDTO} from "./mappers/GameToGameForPlayerMapper";
import {gameSaga} from "./sagas/Main";
import {isReducerName, reducers} from "./reducers/Main";
import {Randomizer} from "./Randomizer";
import {validators} from "./validation/ResponseValidators";
import {validators as cheatsValidators} from "./validation/CheatsValidators";
import {PlayerGameLogListener} from "./PlayerGameLogListener";
import {getInitialGameState} from "./InitGameState";
import {runSaga} from "./sagas/runner/RunSaga";
import {IUser} from "@src/game/interfaces/IUser";
import {ISocketsManager} from "@src/game/interfaces/ISocketsManager";
import {IActionsStorage} from "@src/game/interfaces/IActionsStorage";
import {IClock} from "@src/game/interfaces/IClock";
import {Environment} from "@src/game/sagas/runner/Environment";
import {Channel} from "@src/game/sagas/runner/Channel";
import {
    DeactivateSignal,
    deactivateSignal,
    PlayerLostSignal,
    playerTimeoutSignal
} from "@src/game/sagas/runner/Signals";
import {getPlayerTime} from "@src/game/sagas/components/Time";
import {CancellableRaceProtocol, IParticipant} from "@src/game/CancellableRaceProtocol";
import {Observable} from "@common/Observable";


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

    // resolved when game must be deactivated
    isDeactivated: Observable<boolean>;

    sagaInput: Channel<Action | PlayerLostSignal | DeactivateSignal>;

    private inReplay: boolean = false;

    constructor(
        users: IUser[],
        settings: GameSettings,
        sockets: ISocketsManager,
        storage: IActionsStorage,
        clock: IClock
    ) {
        // aborts all ongoing requests when the game is deactivated
        this.isDeactivated = new Observable(false);

        this.users = users;

        this.state = getInitialGameState(users, settings);

        this.randomizer = new Randomizer(settings.seed);
        this.bus = new ActionsBus();
        this.sockets = sockets;
        this.storage = storage;
        this.clock = clock;

        this.playerGameLog = new PlayerGameLogListener(this.bus, this.users);

        this.sagaInput = new Channel();

        this.playerGameLog.registerListeners();
        this.registerReduceListeners();
        this.registerLogListeners();
        this.registerRandomizerListeners();
        this.registerIOListeners();
        this.registerTimeListeners();
    }

    async activate(): Promise<GameResult> {
        await this.replay(this.storage.getAllActions());

        const env: Environment = {
            output: this.bus,
            input: this.sagaInput,
            state: this.state
        };

        try {
            await runSaga(env, gameSaga);
        } catch (error) {
            if (error === deactivateSignal) {
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
                this.socketRequest(pendingAction);
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

                this.sagaInput.put(actions[0]);
            } else if (actions.length === 0) {
                returnToNormalExecution();
            }
        };

        this.bus.on('*', actionsReplayListener);
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
            this.sagaInput.put(throwDiceResult(this.randomizer.dice()));
        });

        this.bus.on('shuffle', (action) => {
            const result = new Array(action.payload.length);
            for (let i = 0; i < action.payload.length; ++i) {
                result[i] = i;
            }

            this.randomizer.shuffle(result)
            this.sagaInput.put(shuffleResult(result));
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
                this.socketRequest(action);
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

                if (validationResult.error) {
                    return;
                }

                this.sagaInput.put(constructAction(cheatName, validationResult.data) as Action<any, any>);
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
                this.sagaInput.put(timeResult(this.clock.getTime()));
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

    private async socketRequest(request: Action) {
        assert.ok(request.payload && typeof request.payload === "object");
        assert.ok("player" in request.payload && typeof request.payload.player === "number");

        const responseType = request.type.replace("Request", "Response");
        assert.ok(responseType in Actions);

        // There are 3 competing processes:
        // 1. Sending a request and waiting for a reply
        // 2. Waiting for player's timeout
        // 3. Waiting for game cancellation
        // Each of these tasks must cancel all the others.

        class SendRequest implements IParticipant {
            private cancelled = false;
            private response: Action | undefined = undefined;

            constructor(
                private readonly game: Game,
                private readonly requestPlayer: PlayerId,
                private readonly requestPayload: object) {
            }

            isReady(): boolean {
                return false;
            }

            async prepare(): Promise<void> {
                this.game.syncPlayersData();

                // TODO: limit attempts!
                let currentAttempt = 0;
                let errors: string[] = [];

                while (true) {
                    if (this.cancelled) {
                        return;
                    }

                    ++currentAttempt;
                    const response = await this.game.sockets.emit(this.requestPlayer, {
                        withAcknowledgement: true,
                        ensureSending: true
                    }, request.type, {...this.requestPayload, errors});

                    if (!isAction(response)) {
                        errors = ["Ответ должен быть в формате действия."];
                        continue;
                    }

                    try {
                        const validator = validators[responseType as keyof typeof validators] as (state: GameState, request: unknown) => ZodType;
                        const validationResult = validator(structuredClone(this.game.state), request).safeParse(response.payload);

                        if (validationResult.error) {
                            errors = validationResult.error.issues.map(issue => issue.message);
                            continue;
                        }

                        // action comes from a user, payload is validated, but time and uuid are untrusted
                        // constructAction replaces time and uuid
                        this.response = constructAction(responseType, response.payload);

                        return;
                    } catch (err) {
                        errors = ["Произошла ошибка при валидации вашего ответа."];
                    }
                }
            }

            proceed(): void {
                this.game.sagaInput.put(this.response!);
            }

            cancel(): void {
                this.cancelled = true;
            }
        }

        class TimeoutParticipant implements IParticipant {
            private readonly game: Game;
            private readonly remainingTime: number | undefined;
            private interval: NodeJS.Timeout | undefined = undefined;

            constructor(game: Game, player: PlayerId) {
                this.game = game;

                const state = structuredClone(game.state);

                if (!state.settings.timeControlSettings) {
                    this.remainingTime = undefined;
                } else {
                    this.remainingTime = getPlayerTime(state, player, this.game.clock.getTime());
                }
            }

            isReady(): boolean {
                return this.remainingTime !== undefined && this.remainingTime <= 0;
            }

            prepare(): Promise<void> {
                return new Promise(resolve => {
                    if (this.remainingTime) {
                        this.interval = setInterval(resolve, this.remainingTime);
                    }
                });
            }

            proceed(): void {
                this.game.sagaInput.put(playerTimeoutSignal);
            }

            cancel(): void {
                if (this.remainingTime) {
                    clearInterval(this.interval);
                }
            }
        }

        class DeactivateParticipant implements IParticipant {
            private listenerId: number | undefined = undefined;

            constructor(
                private readonly game: Game
            ) {
            }

            isReady(): boolean {
                return this.game.isDeactivated.get();
            }

            prepare(): Promise<void> {
                return new Promise(resolve => {
                    this.listenerId = this.game.isDeactivated.subscribe(() => resolve());
                });
            }

            proceed(): void {
                this.game.sagaInput.put(deactivateSignal);
            }

            cancel(): void {
                this.game.isDeactivated.unsubscribe(this.listenerId!);
            }
        }

        await new CancellableRaceProtocol([
            new DeactivateParticipant(this),
            new TimeoutParticipant(this, request.payload.player),
            new SendRequest(this, request.payload.player, request.payload),
        ]).perform();
    }

    deactivate() {
        this.isDeactivated.set(true);
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
