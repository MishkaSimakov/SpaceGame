import Player, {PlayerId} from "../../../common/Player";
import GameState from "./GameState";
import Spaceship from "../../../common/Spaceship";
import {Server, Socket} from "socket.io";
import FightManager from "./FightManager";
import Module, {ModuleTypes} from "../../../common/modules/Module";
import {Event} from "../../../common/events/Event";
import {AttackReason} from "../../../common/Types";
import {HAS_PLAYERS_DATA} from "../../../common/Sockets";
import {TimeManager, TimeRecordType} from "./TimeManager";
import MessageManager from "./MessageManager";
import {User} from "../entity/user";
import {getDTO} from "./mappers/GameToGameForPlayerMapper";
import SocketsManager from "./io/SocketsManager";
import {GameSettings} from "../../../common/GameSettings";
import ActionsBus from "./actions/ActionsBus";
import {Effect, SagaGenerator} from "./Effects";
import {gameSaga} from "./sagas/Main";
import {Logger} from "./Logger";
import {Action} from "./actions/Action";
import {initGameState, rebuildSpaceshipRequest, rebuildSpaceshipResponse} from "./actions/Actions";
import {reducers} from "./reducers/Main";

function isEmptyObject(value: any): value is {} {
    return Object.keys(value).length === 0;
}

export enum GameStateLegacy {
    WAIT_FOR_PLAYERS,
    STARTED,
    ENDED,
    ERROR
}

interface EffectProcessingResult {
    payload: Promise<any>;
    emitted_actions: Action[];
    new_listeners: any[],
}


export default class Game {
    id: string;
    name: string;

    users: User[];

    state: GameState;
    settings: GameSettings;
    bus: ActionsBus;
    sockets: SocketsManager;
    saga: SagaGenerator;
    logger: Logger;

    // state: GameState = GameState.WAIT_FOR_PLAYERS;

    messageManager: MessageManager;
    timeManager: TimeManager;

    constructor(id: string, name: string, users: User[], settings: GameSettings, io: Server, sockets: new (io: Server, players: PlayerId[]) => any) {
        this.id = id;
        this.name = name;
        this.users = users;

        this.saga = gameSaga();

        this.settings = settings;
        this.state = new GameState();
        this.bus = new ActionsBus();
        this.sockets = new sockets(io, users.map(user => user.id));

        this.logger = new Logger();

        this.messageManager = new MessageManager();

        this.registerReduceListeners();

        this.#initGameState();

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
        this.bus.on(rebuildSpaceshipRequest, this.rebuildSpaceshipRequest.bind(this));
        // this.bus.on(numberRequest, this.sockets.numberRequest.bind(this.io));
    }

    registerReduceListeners() {
        this.bus.on(initGameState, (action: Action) => {
            let copy = structuredClone(this.state);
            reducers['initGameState'](copy, this.settings, action.payload);
            this.state = copy;
            console.log(copy.players);
        })
    }

    rebuildSpaceshipRequest(action: Action) {
        const playerId: PlayerId = action.payload.player;

        this.sockets.emitAndWait(playerId, 'rebuildSpaceship', true).then((newPlayer: Player) => {
            this.bus.emit(rebuildSpaceshipResponse(newPlayer));
        });
    }

    process_effect(effect: Effect): EffectProcessingResult {
        switch (effect.type) {
            case "select": {
                return {
                    payload: Promise.resolve(structuredClone(this.state)),
                    emitted_actions: [],
                    new_listeners: [],
                }
            }
            case "take": {
                let resolve, reject;
                const promise = new Promise<object>((res, rej) => {
                    resolve = res;
                    reject = rej;
                });

                return {
                    payload: promise,
                    emitted_actions: [],
                    new_listeners: [
                        {
                            name: effect.name,
                            listener: resolve
                        }
                    ]
                };
            }
            case "put": {
                return {
                    payload: Promise.resolve({}),
                    emitted_actions: [effect.action],
                    new_listeners: []
                }
            }
            case "all": {
                const result = {
                    promises: [] as Promise<any>[],
                    emitted_actions: [] as Action[],
                    new_listeners: [] as any[]
                };

                for (const index in effect.effects) {
                    const child_effect = effect.effects[index].next().value as Effect;

                    // payload slot passed as reference
                    const child_result = this.process_effect(child_effect);

                    result.promises.push(child_result.payload);
                    result.emitted_actions.push(...child_result.emitted_actions);
                    result.new_listeners.push(...child_result.new_listeners);
                }

                return {
                    payload: Promise.all(result.promises),
                    emitted_actions: result.emitted_actions,
                    new_listeners: result.new_listeners
                };
            }
        }
    }

    async start() {
        let call_args: any = {}

        while (true) {
            const result = this.saga.next(call_args);

            if (result.done) {
                break;
            }

            const effect = this.process_effect(result.value);

            for (const listener of effect.new_listeners) {
                this.bus.once(listener.name, listener.listener);
            }

            for (const action of effect.emitted_actions) {
                this.bus.emit(action);
            }

            call_args = await effect.payload;
        }
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
    //
    getPlayerById(id: number): Player {
        return this.state.players.filter(p => p.id === id)[0];
    }

    #initGameState() {
        const state = new GameState();

        for (const user of this.users) {
            const player = new Player();

            player.id = user.id;
            player.name = user.login;
            player.spaceship = new Spaceship(state.popMainModule());
            player.hand = state.popModuleCards(this.settings.startCardsCount);

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

    changePlayerData(player: Player) {
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
    }

    syncPlayersData() {
        for (let player of this.state.players) {
            this.sockets.getSocket(player.id)?.emit('setGameData', getDTO(this, player));
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

    // async showCardsToPlayer(cards: (Module | Event)[], player: Player, showToOther: boolean) {
    //     if (!showToOther) {
    //         await this.emitToPlayerAndWaitAcknowledgment(player, 'showCardsAndWait', player.id, cards);
    //     } else {
    //         for (let playerToEmit of this.gameData.getPlayers()) {
    //             if (playerToEmit.id === player.id) {
    //                 await this.emitToPlayerAndWaitAcknowledgment(player, 'showCardsAndWait', player.id, cards);
    //             } else {
    //                 this.sockets.getSocket(playerToEmit.id)?.emit('showCards', player.id, cards);
    //             }
    //         }
    //     }
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
