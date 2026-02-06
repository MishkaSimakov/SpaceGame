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
import {deactivateSignal as deactivateSignalSymbol, playerLostSignal} from "@src/game/sagas/runner/Signals";
import {getPlayerTime} from "@src/game/sagas/components/Time";
import {CancellableRaceProtocol, IParticipant} from "@src/game/CancellableRaceProtocol";
import {Observable} from "@common/Observable";
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

    isReplaying: Observable<boolean>;
    replayActions = {
        inputs: [] as ActionWithStorageInfo[],
        outputs: [] as ActionWithStorageInfo[]
    };

    constructor(
        users: IUser[],
        settings: GameSettings,
        sockets: ISocketsManager,
        storage: IActionsStorage,
        clock: IClock
    ) {
        // aborts all ongoing requests when the game is deactivated
        this.isDeactivated = new Observable(false);
        this.isReplaying = new Observable(true);

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
        this.registerPauseSocketListeners();
    }

    private exitReplay() {
        console.log("⏪ exiting replay");
        this.isReplaying.set(false);
        this.gameClock.resume();
    }

    // Пример:
    // 1. smthRequest
    // 2. cheatChangeEnergy
    // ...
    // но нет smthResponse! После cheatChangeEnergy может идти много всяких действий.
    // Идея: искать smthResponse после smthRequest. Если он есть, то не отправлять запрос.
    // Но как принимать ответ? Если пользователь пришлёт ответ раньше, чем закончится повтор, то будет проблема.

    private async processAction(action: Action<string, any, any>) {
        const pastAction = this.replayActions.outputs.shift();
        if (pastAction) {
            console.log(`⏪ replaying: ${pastAction.action.type}`);
            action.uuid = pastAction.action.uuid;

            if (!this.replayActions.outputs.length) {
                this.exitReplay();
            }
        } else {
            this.storage.appendAction(action, ActionPurpose.SAGA_OUTPUT, this.gameClock.getTime());
        }

        const pastResponse = pastAction
            ? this.replayActions.inputs.filter(a => a.action.responseTo === pastAction.action.uuid)[0]?.action
            : undefined;

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
            response = pastResponse ?? await this.socketRequest(action);
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
            response = pastResponse ?? timeResult(this.gameClock.getTime());
        } else if (action.type === 'message') {
            const name = this.users.find(u => u.id === action.payload.player)!.login;
            this.playerGameLog.push({
                text: `${name}: ${action.payload.text}`
            });
        } else {
            throw new Error("Unknown saga output type.");
        }

        if (!response) {
            return;
        }

        // send response
        if (!pastResponse) {
            if (this.isReplaying.get()) {
                await this.awaitReplayEnd();
            }

            response.responseTo = action.uuid;

            this.storage.appendAction(response, ActionPurpose.SAGA_INPUT, this.gameClock.getTime());
            this.sagaInput.put(response);
        }
    }

    private awaitReplayEnd(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.isReplaying.get()) {
                resolve();
            } else {
                let id: number;

                id = this.isReplaying.subscribe((isReplaying: boolean) => {
                    if (!isReplaying) {
                        this.isReplaying.unsubscribe(id);
                        resolve();
                    }
                });
            }
        })
    }

    async activate(): Promise<GameResult> {
        const pastActions = this.storage.getActionsWithStorageInfo();

        this.replayActions.outputs = pastActions.filter(a => a.purpose === ActionPurpose.SAGA_OUTPUT);
        this.replayActions.inputs = pastActions.filter(a => a.purpose === ActionPurpose.SAGA_INPUT);

        if (pastActions.length) {
            const last = pastActions[pastActions.length - 1];
            this.gameClock.setTime(last.storedAtGameTime);
        } else {
            this.exitReplay();
        }

        const env: Environment = {
            output: this.sagaOutput,
            input: this.sagaInput,
            state: this.state
        };

        try {
            // Почему нельзя посылать сразу все действия на вход?
            // - для дебага не получится сравнивать то, что отправляется сейчас, и то, что отправлялось раньше
            // - надо как-то понимать, что повтор закончился
            //   может быть 2 случая: пришёл запрос и ответ есть или пришёл запрос и ответа нет
            const handler = (action: Action) => {
                this.processAction(action);
                this.sagaOutput.take(handler.bind(this));
            }

            this.sagaOutput.take(handler);

            for (const a of pastActions) {
                if (a.purpose === ActionPurpose.SAGA_INPUT && a.action.type !== 'deactivateSignal') {
                    console.log(`⏪ replaying: ${a.action.type}`);
                    this.sagaInput.put(a.action);
                }
            }

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
                // TODO: catch errors
                const validator = cheatsValidators[cheatName as keyof typeof cheatsValidators] as (state: GameState) => ZodType;
                const validationResult = validator(structuredClone(this.state)).safeParse(payload);

                if (validationResult.error) {
                    return;
                }

                const action = constructAction(cheatName, validationResult.data) as Action<any, any>;

                this.storage.appendAction(action, ActionPurpose.SAGA_INPUT, this.gameClock.getTime());
                this.sagaInput.put(action);
                this.syncPlayersData();
            });
        }
    }

    private registerPauseSocketListeners() {
        this.sockets.on('playerRequestsPause', (payload: any) => {
            if (!this.gameClock.isPaused()) {
                console.log("⏯️ paused");
                this.gameClock.pause();
                this.syncPlayersData();
            }
        });

        this.sockets.on('playerRequestsResume', (payload: any) => {
            if (this.gameClock.isPaused()) {
                console.log("⏯️ resumed");
                this.gameClock.resume();
                this.syncPlayersData();
            }
        });
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

                    console.log(response);

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
            private player: PlayerId;

            constructor(game: Game, player: PlayerId) {
                this.game = game;
                this.player = player;

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
                result = Actions.playerTimeoutSignal(this.player);
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
