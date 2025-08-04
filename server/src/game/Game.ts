import * as assert from "node:assert";
import Rand from 'rand-seed';

import Player from "@common/Player";
import ActionsBus from "@common/actions/ActionsBus";
import {GameSettings} from "@common/GameSettings";
import {Action, isAction} from "@common/actions/Action";
import * as Actions from "@common/actions/Main";
import {initGameState} from "@common/actions/Main";
import {DiceResult, shuffle, shuffleResult, throwDice, throwDiceResult} from '@common/actions/Random';

import GameState from "./GameState";
import {User} from "../entity/user";
import {getDTO} from "./mappers/GameToGameForPlayerMapper";
import SocketsManager from "./io/SocketsManager";
import {gameSaga} from "./sagas/Main";
import {Logger} from "./Logger";
import {reducers} from "./reducers/Main";
import {SagaRunner} from "./SagaRunner";
import Spaceship from "@common/Spaceship";

class Randomizer {
    rand: Rand;

    constructor(seed: string) {
        this.rand = new Rand(seed);
    }

    dice(): DiceResult {
        return (Math.floor(this.rand.next() * 6) + 1) as DiceResult;
    }

    shuffle<T>(array: T[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.rand.next() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

export default class Game {
    users: User[];

    randomizer: Randomizer;
    state: GameState;
    bus: ActionsBus;
    sagaRunner: SagaRunner;
    sockets: SocketsManager;
    logger: Logger;

    inReplay: boolean;

    constructor(users: User[], settings: GameSettings, sockets: SocketsManager, logger: Logger) {
        this.users = users;

        this.state = new GameState();
        this.state.settings = settings;
        this.state.players = this.users.map(u => {
            const player = new Player();

            player.id = u.id;
            player.name = u.login;
            player.spaceship = new Spaceship();

            return player;
        });

        this.randomizer = new Randomizer(settings.seed);
        this.bus = new ActionsBus();
        this.sagaRunner = new SagaRunner(this.state, this.bus, gameSaga());
        this.sockets = sockets;
        this.logger = logger;

        this.registerReduceListeners();
        this.registerLogListeners();
        this.registerRandomizerListeners();
        this.registerIOListeners();
    }


    static runFromLogs(users: User[], sockets: SocketsManager, logger: Logger) {
        const pastActions = logger.getPastActions();

        const initAction = pastActions.find(a => a.type === initGameState.name);

        if (!initAction) {
            throw new Error("Failed to initialize game from logs");
        }

        const settings = (initAction as ReturnType<typeof initGameState>).payload.state.settings;

        const game = new Game(users, settings, sockets, logger);
        game.inReplay = true;

        const returnToNormalExecution = (pendingRequest?: Action) => {
            game.bus.off('*', actionsReplayListener);
            game.inReplay = false;

            if (pendingRequest) {
                game.sockets.emitAndWait(
                    pendingRequest.payload.player,
                    pendingRequest.type,
                    true,
                    pendingRequest.payload
                ).then(payload => {
                    if (!isAction(payload)) {
                        throw new Error("Response must be action");
                    }

                    game.bus.emit(payload);
                });
            }
        };

        // register fake sockets listeners
        // they don't send anything to users and read responses from the log file
        const actionsReplayListener = (action: Action) => {
            const pastAction = pastActions.shift();
            console.log("⏪ replay: ", action.type, pastAction.type);

            assert.equal(pastAction.type, action.type);

            if (action.type.endsWith("Request")) {
                if (pastActions.length === 0) {
                    returnToNormalExecution(action);
                    return;
                }

                const responseType = action.type.replace("Request", "Response");

                const pastResponse = pastActions[0];
                assert.equal(pastResponse.type, responseType);

                game.bus.emit(pastResponse);
            } else if (pastActions.length === 0) {
                returnToNormalExecution();
            }
        };

        game.bus.on('*', actionsReplayListener);

        const promise = game.sagaRunner.run();

        return {game, promise};
    }

    registerLogListeners() {
        this.bus.on('*', (action) => {
            if (this.inReplay) {
                return;
            }

            this.logger.handleAction(action);
        });
    }

    registerRandomizerListeners() {
        this.bus.on(throwDice, () => {
            this.bus.emit(throwDiceResult(this.randomizer.dice()));
        });

        this.bus.on(shuffle, (action: ReturnType<typeof shuffle>) => {
            const result = new Array(action.payload.length);
            for (let i = 0; i < action.payload.length; ++i) {
                result[i] = i;
            }

            this.randomizer.shuffle(result)
            this.bus.emit(shuffleResult(result));
        });
    }

    registerIOListeners() {
        this.bus.on('*', async (action: Action) => {
            if (this.inReplay) {
                return;
            }

            // actions that match `*Request` are broadcasted through sockets
            // they must contain payload.player field, the field specify to which player
            // the action is broadcasted.

            // actions that match `*Info` are also broadcasted in the same way,
            // but without an acknowledgment

            if (action.type.endsWith("Request")) {
                const responseType = action.type.replace("Request", "Response");

                assert.ok("player" in action.payload);
                assert.ok(responseType in Actions);

                const payload = await this.sockets.emitAndWait(action.payload.player, action.type, true, action.payload)
                if (!isAction(payload)) {
                    throw new Error("Response must be action");
                }

                this.bus.emit(payload);
            }

            if (action.type.endsWith("Info")) {
                assert.ok("player" in action.payload);
                await this.sockets.emitAndWait(action.payload.player, action.type, false, action.payload)
            }
        });
    }

    registerReduceListeners() {
        this.bus.on('*', (action: Action) => {
            if (action.type in reducers) {
                let copy = structuredClone(this.state);
                reducers[action.type](copy, action.payload);

                // SagaRunner relies on stateRef. Plain assignment would invalidate its reference
                Object.assign(this.state, copy);

                // for the sake of logging
                this.bus.emit(Actions.reducerUpdatedState(this.state));

                if (!this.inReplay) {
                    // notify players about state update
                    this.syncPlayersData();
                }
            }
        });
    }

    async start() {
        this.inReplay = false;
        await this.sagaRunner.run();
    }

    getPlayerById(id: number): Player {
        return this.state.players.filter(p => p.id === id)[0];
    }

    syncPlayersData() {
        console.log("🔄 syncing player data");

        for (let player of this.state.players) {
            const socket = this.sockets.getSocket(player.id);

            if (!socket) {
                console.log(`🔄 sync with player ${player.id} failed`);
            } else {
                console.log(`🔄 sync with player ${player.id} successful`);
                socket.emit('setGameData', getDTO(this, player));
            }
        }
    }
}
