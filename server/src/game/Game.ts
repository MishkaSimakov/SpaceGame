import {Server, Socket} from "socket.io";
import Rand from 'rand-seed';

import Player, {PlayerId} from "@common/Player";
import Spaceship from "@common/Spaceship";
import ActionsBus from "@common/actions/ActionsBus";
import {HAS_PLAYERS_DATA} from "@common/Sockets";
import {GameSettings} from "@common/GameSettings";
import {Action} from "@common/actions/Action";
import * as Actions from "@common/actions/Main";

import GameState from "./GameState";
import {TimeManager, TimeRecordType} from "./TimeManager";
import MessageManager from "./MessageManager";
import {User} from "../entity/user";
import {getDTO} from "./mappers/GameToGameForPlayerMapper";
import SocketsManager from "./io/SocketsManager";
import {gameSaga} from "./sagas/Main";
import {Logger} from "./Logger";
import {reducers} from "./reducers/Main";
import {IRandomizer, SagaRunner} from "./SagaRunner";
import {IOListeners} from "./io/Listeners";
import * as assert from "node:assert";

export enum GameStateLegacy {
    WAIT_FOR_PLAYERS,
    STARTED,
    ENDED,
    ERROR
}

export class Randomizer implements IRandomizer {
    rand: Rand;

    constructor(seed: string) {
        this.rand = new Rand(seed);
    }

    dice(): number {
        return (this.rand.next() * 6) % 6;
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

    // state: GameState = GameState.WAIT_FOR_PLAYERS;

    messageManager: MessageManager;
    timeManager: TimeManager;

    constructor(id: string, name: string, users: User[], settings: GameSettings, sockets: SocketsManager, logger: Logger) {
        this.id = id;
        this.name = name;
        this.users = users;

        this.randomizer = new Randomizer("abracadabra");
        this.state = new GameState();
        this.bus = new ActionsBus();
        this.sagaRunner = new SagaRunner(this.state, this.bus, this.randomizer, gameSaga());
        this.sockets = sockets;
        this.logger = logger;

        this.messageManager = new MessageManager();

        this.registerReduceListeners();
        this.registerLogListeners();
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

    registerIOListeners() {
        this.bus.on('*', (action: Action) => {
            // actions that match `*Request` are broadcasted through sockets
            // they must contain payload.player field, the field specify to which player
            // the action is broadcasted.

            if (action.type.endsWith("Request")) {
                const responseType = action.type.replace("Request", "Response");

                assert.ok("player" in action.payload);
                assert.ok(responseType in Actions);

                this.sockets.emitAndWait(action.payload.player, action.type, true, action.payload)
                    .then((payload: Action) => {
                        this.bus.emit(payload);
                    });
            }
            // if (action.type in IOListeners) {
            //     IOListeners[action.type](action.payload, {
            //         bus: this.bus,
            //         sockets: this.sockets
            //     });
            // }
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

    addPlayersData(message: any[], player: Player) {
        if (message[0] === HAS_PLAYERS_DATA) {
            message.splice(0, 2);
        }

        message.unshift(HAS_PLAYERS_DATA, getDTO(this, player));

        return message;
    }

    // async emitToPlayerAndWaitAcknowledgment(player: Player, event: string, ...args): Promise<any> {
    //     args = this.addPlayersData(args, this.currentPlayer);
    //
    //     return await this.sockets.emitAndWait(player.id, event, true, ...args);
    // }
    //
    // async emitToCurrentPlayerAndWaitAcknowledgment(event: string, ...args): Promise<any> {
    //     args = this.addPlayersData(args, this.currentPlayer);
    //
    //     return await this.sockets.emitAndWait(this.currentPlayer.id, event, true, ...args);
    // }

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

    playerConnected(player: Player, socketId: string) {
        // console.log(`Player ${player.name} connected`);

        // player.socketId = socketId;
        // player.online = true;

        // this.changePlayerData(player);

        this.syncPlayersData();
    }

    // async start() {
    //     console.log("Spaceships started");
    //
    //     this.state = GameState.STARTED;
    //
    //     while (this.state === GameState.STARTED) {
    //         this.syncPlayersData();
    //
    //         await this.makeGameIteration();
    //
    //         this.gameData.advanceCurrentPlayer();
    //     }
    // }

    // changePlayerData(player: Player) {
    // TODO: think about it
    // for (let i = 0; i < this.players.length; ++i) {
    //     if (this.players[i].id === player.id) {
    //         this.players[i] = player;
    //         break;
    //     }
    // }
    //
    // if (this.currentPlayer.id === player.id)
    //     this.currentPlayer = player;
    // }

    syncPlayersData() {
        console.log("🔄 syncing player data");

        for (let player of this.state.players) {
            const socket = this.sockets.getSocket(player.id);

            if (!socket) {
                console.log(`🔄 sync with player ${player.id} failed`);
            } else {
                console.log(`🔄 sync with player ${player.id} successful`);
                this.sockets.getSocket(player.id).emit('setGameData', getDTO(this, player));
            }
        }

        // for (let viewer of this.viewers) {
        // this.getSocket(viewer).emit('setGameData', getViewerDTO(this));
        // }
    }

    // setDestroyed(player: Player) {
    //     player.setLose();
    //
    //     this.gameData.discardCards(player.hand);
    //     player.hand = [];
    //
    //     player.spaceship.modules = player.spaceship.modules.filter(m => !m.isMain);
    //     this.gameData.discardCards(player.spaceship.modules);
    //     player.spaceship.modules = [];
    //
    //     this.changePlayerData(player);
    //
    //     console.log(`${player.name} lost`);
    // }

    // async choosePlayerForAttack(attackReason: AttackReason): Promise<Player | void> {
    //     const attackedPlayerId: number | undefined = await this.emitToCurrentPlayerAndWaitAcknowledgment('choosePlayerForAttack', attackReason);
    //     if (attackedPlayerId === undefined) {
    //         return;
    //     }
    //
    //     return this.getPlayerById(attackedPlayerId);
    // }

    // async attackPlayer(attackedPlayer: Player) {
    //     console.log(`   Player ${this.currentPlayer.name} has attacked player ${attackedPlayer.name}`);
    //
    //     this.currentFight = new FightManager(this.currentPlayer, attackedPlayer, this);
    //     let destroyedPlayer = await this.currentFight.fight();
    //
    //     this.currentFight = undefined;
    //
    //     if (destroyedPlayer !== undefined) {
    //         console.log(`   Player ${destroyedPlayer.name} was destroyed`);
    //         this.setDestroyed(destroyedPlayer);
    //     }
    //
    //     // if all players destroyed except one
    //     if (Object.entries(this.gameData.getPlayers()).filter(([_, player]) => !player.isLose()).length === 1) {
    //         this.state = GameState.ENDED;
    //     }
    // }

    // async showCardsToPlayer(cards: (Module | Event)[], player: PlayerId, showToOther: boolean) {
    //     if (showToOther) {
    //         for (let playerToEmit of this.state.players) {
    //             if (playerToEmit.id === player) {
    //                 continue;
    //             }
    //
    //             this.sockets.getSocket(playerToEmit.id)?.emit('showCards', player, cards);
    //         }
    //     }
    //
    //     await this.sockets.emitAndWait(player, 'showCardsAndWait', true, player, cards);
    // }

    // async askForUseModuleSecondTime(player: Player, module: ModuleTypes): Promise<boolean> {
    //     return await this.emitToPlayerAndWaitAcknowledgment(player, 'askForUseModuleSecondTime', module);
    // }

    // async makeGameIteration() {
    //     console.log(`Turn of player ${this.currentPlayer.name}`);
    //
    //     this.timeManager.addRecord(TimeRecordType.DEFAULT_TURN_STARTED, this.currentPlayer.id);
    //
    //     this.currentPlayer.usedRepairOrAttackModuleSecondTimeOnThisTurn = false;
    //
    //     for (let phase of this.phases) {
    //         try {
    //             await phase(this);
    //         } catch (err) {
    //             console.error(err);
    //
    //             this.state = GameState.ERROR;
    //         }
    //
    //         if (this.timeManager.getPlayersTime()[this.currentPlayer.id] <= 0 && this.settings.loseWhenTimeout) {
    //             this.currentPlayer.setLose();
    //         }
    //
    //         if (this.currentPlayer.isLose()) {
    //             break;
    //         }
    //
    //         if (this.state === GameState.ENDED || this.state === GameState.ERROR) {
    //             break;
    //         }
    //
    //         this.syncPlayersData();
    //     }
    //
    //     this.timeManager.addRecord(TimeRecordType.DEFAULT_TURN_ENDED, this.currentPlayer.id);
    //
    //     this.syncPlayersData();
    // }
}
