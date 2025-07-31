import Rand from 'rand-seed';

import Player from "@common/Player";
import Spaceship from "@common/Spaceship";
import ActionsBus from "@common/actions/ActionsBus";
import {GameSettings} from "@common/GameSettings";
import {Action, isAction} from "@common/actions/Action";
import * as Actions from "@common/actions/Main";

import GameState from "./GameState";
import {TimeManager} from "./TimeManager";
import MessageManager from "./MessageManager";
import {User} from "../entity/user";
import {getDTO} from "./mappers/GameToGameForPlayerMapper";
import SocketsManager from "./io/SocketsManager";
import {gameSaga} from "./sagas/Main";
import {Logger} from "./Logger";
import {reducers} from "./reducers/Main";
import {SagaRunner} from "./SagaRunner";
import * as assert from "node:assert";
import {DiceResult, shuffle, shuffleResult, throwDice, throwDiceResult} from '@common/actions/Random';

class Randomizer {
    rand: Rand;

    constructor(seed: string) {
        this.rand = new Rand(seed);
    }

    dice(): DiceResult {
        return ((this.rand.next() * 6) % 6) as DiceResult;
    }

    shuffle<T>(array: T[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.rand.next() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

export default class Game {
    id: string;
    name: string;

    users: User[];

    randomizer: Randomizer;
    state: GameState;
    bus: ActionsBus;
    sagaRunner: SagaRunner;
    sockets: SocketsManager;
    logger: Logger;

    messageManager: MessageManager;
    timeManager: TimeManager;

    constructor(id: string, name: string, users: User[], settings: GameSettings, sockets: SocketsManager, logger: Logger) {
        this.id = id;
        this.name = name;
        this.users = users;

        this.randomizer = new Randomizer("abracadabra");
        this.state = new GameState();
        this.bus = new ActionsBus();
        this.sagaRunner = new SagaRunner(this.state, this.bus, gameSaga());
        this.sockets = sockets;
        this.logger = logger;

        this.messageManager = new MessageManager();

        this.registerReduceListeners();
        this.registerLogListeners();
        this.registerRandomizerListeners();
        this.registerIOListeners();

        this.#initGameState(settings);

        this.syncPlayersData();

        // this.currentPlayer = this.players[0];

        // if (!this.settings.timeControlSettings) {
        //     this.settings.timeControlSettings = {
        //         START_TIME: 5 * 60 * 1000,
        //         DEFAULT_TIME_INCREASE: 45 * 1000,
        //         FIGHT_TIME_INCREASE: 10 * 1000,
        //     };
        // }
        //
        // this.timeManager = new TimeManager(this.settings.timeControlSettings, users.map(user => user.id));
    }

    registerLogListeners() {
        this.bus.on('*', this.logger.handleAction.bind(this.logger));
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

                // notify players about state update
                this.syncPlayersData();
            }
        });
    }

    async start() {
        await this.sagaRunner.run();
    }

    getPlayerById(id: number): Player {
        return this.state.players.filter(p => p.id === id)[0];
    }

    #initGameState(settings: GameSettings) {
        const state = new GameState();

        this.randomizer.shuffle(state.stack.module);
        this.randomizer.shuffle(state.stack.event);
        this.randomizer.shuffle(state.mainModules)

        state.settings = settings;

        for (const user of this.users) {
            const player = new Player();

            player.id = user.id;
            player.name = user.login;
            player.hand = state.stack.module.splice(0, state.settings.startCardsCount);

            // initialize spaceship
            const mainModule = state.mainModules.pop();
            mainModule.x = 0;
            mainModule.y = 0;

            player.spaceship = new Spaceship();
            player.spaceship.modules.push(mainModule);

            state.players.push(player)
        }

        this.randomizer.shuffle(state.players);

        this.bus.emit(Actions.initGameState(state));
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
