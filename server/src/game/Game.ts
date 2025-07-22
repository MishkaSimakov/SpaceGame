import Player, {PlayerId} from "../../../common/Player";
import GameState from "./GameState";
import Spaceship from "../../../common/Spaceship";
import {Server, Socket} from "socket.io";
import {HAS_PLAYERS_DATA} from "../../../common/Sockets";
import {TimeManager, TimeRecordType} from "./TimeManager";
import MessageManager from "./MessageManager";
import {User} from "../entity/user";
import {getDTO} from "./mappers/GameToGameForPlayerMapper";
import SocketsManager from "./io/SocketsManager";
import {GameSettings} from "../../../common/GameSettings";
import ActionsBus from "./actions/ActionsBus";
import {gameSaga} from "./sagas/Main";
import {Logger} from "./Logger";
import {Action} from "./actions/Action";
import {initGameState} from "./actions/Actions";
import {reducers} from "./reducers/Main";
import {SagaRunner} from "./SagaRunner";
import Module from "../../../common/modules/Module";
import {Event} from "../../../common/events/Event";
import {IOListeners} from "./io/Listeners";

export enum GameStateLegacy {
    WAIT_FOR_PLAYERS,
    STARTED,
    ENDED,
    ERROR
}

export default class Game {
    id: string;
    name: string;

    users: User[];

    state: GameState;
    settings: GameSettings;
    bus: ActionsBus;
    sagaRunner: SagaRunner;
    sockets: SocketsManager;
    logger: Logger;

    // state: GameState = GameState.WAIT_FOR_PLAYERS;

    messageManager: MessageManager;
    timeManager: TimeManager;

    constructor(id: string, name: string, users: User[], settings: GameSettings, io: Server, sockets: new (io: Server, players: PlayerId[]) => any) {
        this.id = id;
        this.name = name;
        this.users = users;

        this.settings = settings;
        this.state = new GameState();
        this.bus = new ActionsBus();
        this.sagaRunner = new SagaRunner(this.state, this.bus, gameSaga());
        this.sockets = new sockets(io, users.map(user => user.id));
        this.logger = new Logger();

        this.messageManager = new MessageManager();

        this.registerReduceListeners();
        this.registerLogListeners();
        this.registerIOListeners();

        this.#initGameState();

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
            if (action.type in IOListeners) {
                IOListeners[action.type](action, {
                    bus: this.bus,
                    sockets: this.sockets
                });
            }
        });
    }

    registerReduceListeners() {
        this.bus.on('*', (action: Action) => {
            if (action.type in reducers) {
                let copy = structuredClone(this.state);
                reducers[action.type](copy, this.settings, action.payload);

                // SagaRunner relies on stateRef. Plain assignment would invalidate its reference
                Object.assign(this.state, copy);
            }
        });
    }

    async start() {
        await this.sagaRunner.run();
    }

    // handleDestroyedModules(target: Player, attacker: Player, destroyedModules: {
    //     module: Module,
    //     byReactor: boolean
    // }[], isEvent: boolean) {
    //     for (let destroyedInfo of destroyedModules) {
    //         let module = destroyedInfo.module
    //
    //         console.log(`   Module at x: ${module.x}, y: ${module.y} has been destroyed`);
    //
    //         module.isActivated = false;
    //
    //         target.spaceship.removeModule(module);
    //
    //         if (module.type === ModuleTypes.MainModule) {
    //             return;
    //         }
    //
    //         module.health = module.totalHealth;
    //
    //         if (isEvent || destroyedInfo.byReactor) {
    //             this.gameData.discardCards([module]);
    //         } else {
    //             attacker.hand.push(module);
    //         }
    //     }
    //
    //     if (destroyedModules.length !== 0) {
    //         let unconnectedModules = target.spaceship.getUnconnectedModules();
    //
    //         target.spaceship.removeModule(unconnectedModules);
    //         target.hand.push(...unconnectedModules);
    //     }
    //
    //     // dark matter generator destroyed
    //     if (destroyedModules.filter((d) => d.module.type === ModuleTypes.DarkMatterGenerator).length) {
    //         let modulesExceptMain = target.spaceship.modules.filter(m => m.type !== ModuleTypes.MainModule);
    //
    //         target.spaceship.removeModule(modulesExceptMain);
    //         target.hand.push(...modulesExceptMain);
    //     }
    //
    //     target.energy = Math.min(target.energy, target.spaceship.getTotalCapacity());
    //
    //     if (!target.spaceship.getMainModule()) {
    //         target.setLose();
    //     }
    // }

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

    #initGameState() {
        const state = new GameState();

        for (const user of this.users) {
            const player = new Player();

            player.id = user.id;
            player.name = user.login;
            player.hand = state.popModuleCards(this.settings.startCardsCount);

            // initialize spaceship
            const mainModule = state.popMainModule();
            mainModule.x = 0;
            mainModule.y = 0;

            player.spaceship = new Spaceship();
            player.spaceship.modules.push(mainModule);

            state.players.push(player)
        }

        this.bus.emit(initGameState(state));
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

    // getPlayerIndexByOffset(offset: number): number {
    //     let currentPlayerIndex = this.gameData.getCurrentPlayerIndex();
    //     const playersCount = this.gameData.getPlayers().length;
    //
    //     do {
    //         currentPlayerIndex = (currentPlayerIndex + Math.sign(offset) + playersCount) % playersCount;
    //
    //         if (!this.gameData.getPlayers()[currentPlayerIndex].isLose()) {
    //             offset += -Math.sign(offset);
    //         }
    //     } while (offset !== 0);
    //
    //     return currentPlayerIndex;
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
