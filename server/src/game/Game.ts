import * as assert from "node:assert";
import jsonpatch from 'fast-json-patch'
import {ZodType} from "zod";

import {GameSettings, GameState, Message, Player, PlayerId, TimeRecordType} from "@common/Types"
import * as Actions from "@common/Actions";
import {addTimeRecord, reducerUpdatedState, shuffleResult, throwDiceResult, timeResult} from "@common/Actions";
import {Action, constructAction, isAction} from "@common/ActionsHelpers";

import ActionsBus from "./ActionsBus";
import {getDTO} from "./mappers/GameToGameForPlayerMapper";
import {gameSaga} from "./sagas/Main";
import {isReducerName, reducers} from "./reducers/Main";
import {Randomizer} from "./Randomizer";
import {validators} from "./validation/ResponseValidators";
import {validators as cheatsValidators} from "./validation/CheatsValidators";
import {getInitialGameState} from "./InitGameState";
import {runSaga} from "./sagas/runner/RunSaga";
import {IUser} from "@src/game/interfaces/IUser";
import {ISocketsManager} from "@src/game/interfaces/ISocketsManager";
import {ActionPurpose, ActionWithStorageInfo, IActionsStorage} from "@src/game/interfaces/IActionsStorage";
import {IClock, Milliseconds} from "@src/game/interfaces/IClock";
import {Environment} from "@src/game/sagas/runner/Environment";
import {Channel} from "@src/game/sagas/runner/Channel";
import {deactivateSignal as deactivateSignalSymbol} from "@src/game/sagas/runner/Signals";
import {getPlayerTime, getTimeDecreasingPlayerId} from "@src/game/sagas/components/Time";
import {CancellableRaceProtocol, IParticipant} from "@src/game/CancellableRaceProtocol";
import {Observable} from "@common/Observable";
import {Exception} from "handlebars";
import {StateGetters} from "@common/getters/State";


export type GameResult = { type: "deactivated" } | { type: "finished", winner: PlayerId };

type TimeoutHandle = () => void;

class GameClock {
    private shift: number = 0;
    private pausedAt: number | undefined = 0;

    private deadlines: [number, () => void][] = [];

    constructor(
        private wallClock: IClock
    ) {
        this.checkDeadlines();
    }

    getTime(): Milliseconds {
        return this.pausedAt ?? (this.wallClock.getTime() - this.shift);
    }

    pause() {
        assert.ok(!this.isPaused());

        this.pausedAt = this.getTime();
    }

    resume() {
        assert.ok(this.isPaused());

        this.shift = this.wallClock.getTime() - this.pausedAt!;
        this.pausedAt = undefined;
    }

    isPaused(): boolean {
        return this.pausedAt !== undefined;
    }

    setTime(time: Milliseconds) {
        if (this.isPaused()) {
            this.pausedAt = time;
        } else {
            this.shift = this.wallClock.getTime() - time;
        }
    }

    setTimeout(callback: () => void, delay: Milliseconds): TimeoutHandle {
        const deadline = this.getTime() + delay;

        this.deadlines.push([deadline, callback]);
        return callback;
    }

    removeTimeout(handle: TimeoutHandle) {
        this.deadlines = this.deadlines.filter(([d, c]) => c != handle);
    }

    private checkDeadlines() {
        const currentTime = this.getTime();

        this.deadlines = this.deadlines.filter(([deadline, callback]) => {
            if (deadline <= currentTime) {
                callback();
                return false;
            }

            return true;
        });

        this.wallClock.setTimeout(500, this.checkDeadlines.bind(this));
    }
}

/*
Проблемы:
2. Сохранять время при деактивации игры
 - Ввести внутреигровые часы, которые будут вручную переводиться каждую секунду, пока игра работает
 - Ввести специальный action, который будет указывать, как долго игра была деактивирована
   Этот action нужно добавлять после перезапуска игры. А если ставим на паузу? А если сервер сломается во время паузы?
   На время паузы деактивировать игру? Если нет, то нужно как-то отменять все таймауты
   Время берётся из событий. Сейчас события получают время, используя Date.now(), а не clock.getTime().
    - Сделать время необязательным атрибутом действий и добавлять время к действиям внутри Game

Логически должно быть 2 режима работы: восстановление прошедших событий и обработка текущих событий
Они не должны пересекаться. При восстановлении прошедших событий не нужно отправлять запросы пользователю. Вместо этого надо сразу считывать ответы из логов.
Также нужно что-то сделать со временем. А если увеличивать время только во время ожидания ответа от пользователя?
Тогда при восстановлении можно поддерживать в точности такое же игровое время.
Остаётся только логика запросов к пользователю и записи в логи.
События не нужно записывать в логи, пока идёт восстановление. Добавить флаг inReplay. Но когда его выключать?
После того как отправлено или получено последнее сообщение, которое есть в логах.

Во время восстановления не надо отправлять запросы пользователю.
Идея: всегда в конце логов добавлять deactivateSignal, если его нет. Тогда восстановление всегда будет заканчиваться на попытке отправить deactivateSignal в игру

 */
export default class Game {
    users: IUser[];

    randomizer: Randomizer;
    state: GameState;
    bus: ActionsBus;
    sockets: ISocketsManager;
    storage: IActionsStorage;
    playerGameLog: Message[] = [];

    wallClock: IClock;
    gameClock: GameClock;

    // resolved when game must be deactivated
    isDeactivated: Observable<boolean>;

    sagaInput: Channel<Action>;
    sagaOutput: Channel<Action>;

    replayActions: ActionWithStorageInfo[] = [];

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

        this.wallClock = clock;
        this.gameClock = new GameClock(this.wallClock);

        this.sagaInput = new Channel();
        this.sagaOutput = new Channel();

        this.registerCheatsSocketListeners();
    }

    private insertPause(from: number, to: number) {
        const player = getTimeDecreasingPlayerId(this.state);

        if (player) {
            this.processAction(addTimeRecord(player, TimeRecordType.PAUSE_STARTED, from));
            this.processAction(addTimeRecord(player, TimeRecordType.PAUSE_ENDED, to));
        }
    }

    private exitReplay() {
        console.log("⏪ exiting replay")
        this.gameClock.resume();
    }

    // returns next replay action without removing it from queue
    // skips deactivateSignals and cheats
    // throws an error if peeked action type is not equal to expected
    private peekReplayAction(expectedType: string): Action | undefined {
        const hadActions = this.replayActions.length !== 0;

        while (this.replayActions.length) {
            const pastAction = this.replayActions[0].action;

            console.log(`⏪ Replaying ${pastAction.type}`);

            if (pastAction.type.startsWith('cheat')) {
                this.sagaInput.put(pastAction);
                this.replayActions.shift();
                continue;
            }
            if (pastAction.type === 'deactivateSignal') {
                this.replayActions.shift();
                continue;
            }

            if (pastAction.type !== expectedType) {
                throw new Error(`Error during game replay: unexpected action type (in a log file ${pastAction.type}, received ${expectedType}). This is possibly due to changes in gameSaga code.`);
            }

            return pastAction;
        }

        if (hadActions) {
            this.exitReplay();
        }

        return undefined;
    }

    private shiftReplayAction(expectedType: string): Action | undefined {
        const action = this.peekReplayAction(expectedType);

        if (!action) {
            return undefined;
        }

        this.replayActions.shift();

        if (!this.replayActions.length) {
            this.exitReplay();
        }

        return action;
    }

    private async processAction(action: Action<string, any, any>) {
        const pastAction = this.shiftReplayAction(action.type);
        if (!pastAction) {
            this.storage.appendAction(action, ActionPurpose.SAGA_OUTPUT, this.gameClock.getTime());
        }

        let response: Action | undefined = undefined;

        if (isReducerName(action.type)) {
            let copy = structuredClone(this.state);

            // @ts-ignore
            reducers[action.type](copy, action.payload);

            const delta = jsonpatch.compare(this.state, copy);

            // SagaRunner relies on stateRef. Plain assignment would invalidate its reference
            Object.assign(this.state, copy);

            response = reducerUpdatedState(delta);
        } else if (action.type === 'throwDice') {
            response = throwDiceResult(this.randomizer.dice())
        } else if (action.type === 'shuffle') {
            const result = new Array(action.payload.length);
            for (let i = 0; i < action.payload.length; ++i) {
                result[i] = i;
            }

            this.randomizer.shuffle(result)
            response = shuffleResult(result);
        } else if (action.type.endsWith('Request')) {
            // actions that match `*Request` are broadcasted through sockets
            // they must contain payload.player field, the field specify to which player
            // the action is broadcasted.
            const responseType = action.type.replace("Request", "Response");

            response = this.peekReplayAction(responseType) ?? await this.socketRequest(action);
        } else if (action.type.endsWith("Info")) {
            // actions that match `*Info` are also broadcasted in the same way,
            // but without an acknowledgment

            // do not send info when replaying game
            if (!pastAction) {
                assert.ok("player" in action.payload);

                this.sockets.emit(action.payload.player, {
                    withAcknowledgement: false,
                    ensureSending: true
                }, action.type, action.payload);
            }
        } else if (action.type === 'time') {
            response = this.peekReplayAction('timeResult') ?? timeResult(this.gameClock.getTime());
        } else if (action.type === 'message') {
            const name = this.users.find(u => u.id === action.payload.player)!.login;
            this.playerGameLog.push({
                text: `${name}: ${action.payload.text}`
            });
        } else {
            throw new Exception("Unknown saga output type.");
        }

        if (!response) {
            return;
        }

        // send response
        const pastResponse = this.shiftReplayAction(response.type);

        if (!pastResponse) {
            this.storage.appendAction(response, ActionPurpose.SAGA_INPUT, this.gameClock.getTime());
        }

        this.sagaInput.put(response);
    }

    async activate(): Promise<GameResult> {
        this.replayActions = this.storage.getActionsWithStorageInfo();

        if (this.replayActions.length) {
            const last = this.replayActions[this.replayActions.length - 1];
            this.gameClock.setTime(last.storedAtGameTime);
        } else {
            this.gameClock.resume();
        }

        const env: Environment = {
            output: this.sagaOutput,
            input: this.sagaInput,
            state: this.state
        };

        try {
            const handler = (action: Action) => {
                this.processAction(action).then(() => {
                    this.sagaOutput.take(handler.bind(this));
                });
            }

            this.sagaOutput.take(handler);

            await runSaga(env, gameSaga);
        } catch (error) {
            if (error === deactivateSignalSymbol) {
                return {type: "deactivated"};
            } else {
                throw error;
            }
        }

        // game has finished
        // notify players about this
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

    private registerCheatsSocketListeners() {
        for (const cheatName of Object.keys(Actions).filter(a => a.startsWith('cheat'))) {
            this.sockets.on(cheatName, (payload: any) => {
                const validator = cheatsValidators[cheatName as keyof typeof cheatsValidators] as (state: GameState) => ZodType;
                const validationResult = validator(structuredClone(this.state)).safeParse(payload);

                if (validationResult.error) {
                    return;
                }

                const action = constructAction(cheatName, validationResult.data) as Action<any, any>;

                this.storage.appendAction(action, ActionPurpose.SAGA_INPUT, this.gameClock.getTime());
                this.sagaInput.put(action);
            });
        }
    }

    getPlayerById(id: number): Player {
        return StateGetters.playerById(this.state, id)!;
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

    private async socketRequest(request: Action): Promise<Action> {
        assert.ok(request.payload && typeof request.payload === "object");
        assert.ok("player" in request.payload && typeof request.payload.player === "number");

        const responseType = request.type.replace("Request", "Response");
        assert.ok(responseType in Actions);

        // There are 3 competing processes:
        // 1. Sending a request and waiting for a reply
        // 2. Waiting for player's timeout
        // 3. Waiting for game cancellation
        // Each of these tasks must cancel all the others.

        let result: Action | undefined = undefined;

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
                result = this.response!;
            }

            cancel(): void {
                this.cancelled = true;
            }
        }

        class TimeoutParticipant implements IParticipant {
            private readonly game: Game;
            private readonly remainingTime: number | undefined;
            private timeout: TimeoutHandle | undefined = undefined;

            constructor(game: Game, player: PlayerId) {
                this.game = game;

                const state = structuredClone(game.state);

                if (!state.settings.timeControlSettings) {
                    this.remainingTime = undefined;
                } else {
                    this.remainingTime = getPlayerTime(state, player, this.game.gameClock.getTime());
                }
            }

            isReady(): boolean {
                return this.remainingTime !== undefined && this.remainingTime <= 0;
            }

            prepare(): Promise<void> {
                return new Promise(resolve => {
                    if (this.remainingTime) {
                        this.timeout = this.game.gameClock.setTimeout(resolve, this.remainingTime);
                    }
                });
            }

            proceed(): void {
                result = Actions.playerTimeoutSignal();
            }

            cancel(): void {
                if (this.remainingTime && this.timeout) {
                    this.game.gameClock.removeTimeout(this.timeout);
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
                result = Actions.deactivateSignal();
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

        assert.ok(result);
        return result;
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
