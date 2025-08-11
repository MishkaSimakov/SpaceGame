import * as assert from "node:assert";
import jsonpatch from 'fast-json-patch'

import Player from "@common/Player";
import ActionsBus from "./ActionsBus";
import {GameSettings} from "@common/GameSettings";
import {Action, isAction} from "@common/actions/Action";
import Spaceship from "@common/Spaceship";
import Actions from "@common/actions/Main"

import GameState from "./GameState";
import {User} from "../entity/user";
import {getDTO} from "./mappers/GameToGameForPlayerMapper";
import SocketsManager from "./io/SocketsManager";
import {gameSaga} from "./sagas/Main";
import {Logger} from "./Logger";
import {reducers} from "./reducers/Main";
import {SagaRunner} from "./sagas/SagaRunner";
import {Randomizer} from "./Randomizer";
import {LossMiddleware} from "./LossMiddleware";

export default class Game {
    users: User[];

    randomizer: Randomizer;
    state: GameState;
    bus: ActionsBus;
    sagaRunner: SagaRunner<void>;
    sockets: SocketsManager;
    logger: Logger;

    inReplay: boolean = false;

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
        this.sagaRunner = new SagaRunner(this.state, this.bus, gameSaga);
        this.sockets = sockets;
        this.logger = logger;

        this.registerReduceListeners();
        this.registerLogListeners();
        this.registerRandomizerListeners();
        this.registerIOListeners();
        this.registerTimeListeners();

        this.registerLossMiddleware();

        this.bus.on('playerLost', (action) => {
            this.bus.emit(Actions.sendPlayerLostInfo(action.payload.player));
        });
    }

    async activate(): Promise<{ status: "cancelled" | "finished" }> {
        await this.replay(this.logger.getPastActions());

        const result = await this.sagaRunner.run();

        return result === "cancel" ? {status: "cancelled"} : {status: "finished"};
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
            if (actions.length === 0) {
                return;
            }

            const pastAction = actions.shift();
            console.log("⏪ replay: ", pastAction.uuid, action.type, pastAction.type, "remaining: ", actions.length);

            assert.equal(pastAction.type, action.type);

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

    registerLossMiddleware() {
        const loss = new LossMiddleware(this.state, this.sagaRunner);
        this.bus.registerMiddleware(loss);
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
        this.bus.on('throwDice', () => {
            this.bus.emit(Actions.throwDiceResult(this.randomizer.dice()));
        });

        this.bus.on('shuffle', (action) => {
            const result = new Array(action.payload.length);
            for (let i = 0; i < action.payload.length; ++i) {
                result[i] = i;
            }

            this.randomizer.shuffle(result)
            this.bus.emit(Actions.shuffleResult(result));
        });
    }

    registerIOListeners() {
        this.bus.on('*', async (action) => {
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
                this.sockets.emitAndWait(action.payload.player, action.type, false, action.payload)
            }
        });
    }

    registerReduceListeners() {
        this.bus.on('*', (action) => {
            if (action.type in reducers) {
                let copy = structuredClone(this.state);
                reducers[action.type](copy, action.payload);

                const delta = jsonpatch.compare(this.state, copy);

                // SagaRunner relies on stateRef. Plain assignment would invalidate its reference
                Object.assign(this.state, copy);

                // for the sake of logging
                this.bus.emit(Actions.reducerUpdatedState(delta));

                if (!this.inReplay) {
                    // notify players about state update
                    this.syncPlayersData();
                }
            }
        });
    }

    registerTimeListeners() {
        this.bus.on('time', (action) => {
            if (this.inReplay) {
                return;
            }

            this.bus.emit(Actions.timeResult(action.time));
        });
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

    private sendSocketRequest(action: Action<string, any, any>) {
        const responseType = action.type.replace("Request", "Response");

        assert.ok("player" in action.payload);
        assert.ok(responseType in Actions);

        this.sockets.emitAndWait(action.payload.player, action.type, true, action.payload)
            .then((payload: any) => {
                if (!isAction(payload)) {
                    throw new Error("Response must be action");
                }

                this.bus.emit(payload);
            });
    }
}
