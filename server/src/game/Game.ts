import Player from "../../../common/Player";
import GameData from "./GameData";
import Spaceship from "../../../common/Spaceship";
import {Server, Socket} from "socket.io";
import FightManager from "./FightManager";
import Module, {ModuleTypes} from "../../../common/modules/Module";
import {Event} from "../../../common/events/Event";
import {AttackReason} from "../../../common/Types";
import {HAS_PLAYERS_DATA} from "../../../common/Sockets";
import GameToGameForPlayerMapper from "./GameToGameForPlayerMapper";
import {TimeManager, TimeRecordType} from "./TimeManager";
import MessageManager from "./MessageManager";
import {GameSettings} from "../../../common/GameForPlayerDTO";
import {User} from "../entity/user";
import {beforeTurn} from "./phases/BeforeTurn";
import {collectEnergy} from "./phases/CollectEnergy";
import {rebuildSpaceship} from "./phases/RebuildSpaceship";
import {fixSpaceship} from "./phases/FixSpaceship";
import {attack} from "./phases/Attack";
import {drawCards} from "./phases/DrawCards";
import {discardCards} from "./phases/DiscardCards";

export enum GameState {
    WAIT_FOR_PLAYERS,
    STARTED,
    ENDED,
    ERROR
}

export default class Game {
    id: string;
    name: string;

    gameData: GameData;

    settings: GameSettings;

    players: Player[] = [];

    currentPlayer: Player;

    io: Server;

    state: GameState = GameState.WAIT_FOR_PLAYERS;

    currentEmitPlayerId: number;
    currentEmitFunction: () => void;

    ENERGY_TO_ATTACK_BY_COMMAND_MODULE: number = 7;
    ENERGY_TO_MOVE_DAMAGE_BY_COMMAND_MODULE: number = 4;
    ENERGY_TO_DRAG_ANOTHER_EVENT_CARD_BY_MAIN_MODULE: number = 4;
    ENERGY_TO_DRAG_ADDITIONAL_CARD_BY_MAIN_MODULE: number = 15;

    currentFight?: FightManager;

    timeManager: TimeManager;

    messageManager: MessageManager;

    phases: Array<(game: Game) => void> = [
        beforeTurn,
        collectEnergy,
        rebuildSpaceship,
        fixSpaceship,
        attack,
        drawCards,
        discardCards
    ];

    // logger: Logger;

    constructor(id: string, name: string, users: User[], settings: GameSettings, io: Server) {
        // this.logger = new Logger(this);
        // this.logger.log("game created!");
        this.id = id;
        this.name = name;

        this.settings = settings;

        this.gameData = new GameData();

        this.io = io;

        for (let user of users)
            this.players.push(this.createPlayer(user));

        this.currentPlayer = this.players[0];

        if (!this.settings.timeControlSettings) {
            this.settings.timeControlSettings = {
                START_TIME: 5 * 60 * 1000,
                DEFAULT_TIME_INCREASE: 45 * 1000,
                FIGHT_TIME_INCREASE: 10 * 1000,
            };
        }
        this.timeManager = new TimeManager(this.settings.timeControlSettings, this.players);

        this.messageManager = new MessageManager();
    }

    handleDestroyedModules(target: Player, attacker: Player, destroyedModules: {
        module: Module,
        byReactor: boolean
    }[], isEvent: boolean) {
        for (let destroyedInfo of destroyedModules) {
            let module = destroyedInfo.module

            console.log(`   Module at x: ${module.x}, y: ${module.y} has been destroyed`);

            module.isActivated = false;

            target.spaceship.removeModule(module);

            if (module.type === ModuleTypes.MainModule) {
                return;
            }

            module.health = module.totalHealth;

            if (isEvent || destroyedInfo.byReactor) {
                this.gameData.discardCards([module]);
            } else {
                attacker.hand.push(module);
            }
        }

        if (destroyedModules.length !== 0) {
            let unconnectedModules = target.spaceship.getUnconnectedModules();

            target.spaceship.removeModule(unconnectedModules);
            target.hand.push(...unconnectedModules);
        }

        // dark matter generator destroyed
        if (destroyedModules.filter((d) => d.module.type === ModuleTypes.DarkMatterGenerator).length) {
            let modulesExceptMain = target.spaceship.modules.filter(m => m.type !== ModuleTypes.MainModule);

            target.spaceship.removeModule(modulesExceptMain);
            target.hand.push(...modulesExceptMain);
        }

        target.energy = Math.min(target.energy, target.spaceship.getTotalCapacity());

        if (!target.spaceship.getMainModule()) {
            target.setLose();
        }
    }

    isPlayerInFight(player: Player): boolean {
        if (!this.currentFight) return false;

        return player.id === this.currentFight.first.id || player.id === this.currentFight.second.id;
    }

    addPlayersData(message: any[], player: Player) {
        if (message[0] === HAS_PLAYERS_DATA) {
            message.splice(0, 2);
        }

        message.unshift(HAS_PLAYERS_DATA, GameToGameForPlayerMapper.getDTO(this, player));

        return message;
    }

    emitToPlayerAndWait(player: Player, event: string, ...args): Promise<any> {
        return new Promise(resolve => {
            // generate function that must be called when player connected

            let emitFunction = () => {
                // add information that players data contains in this message
                // add players data to the front to keep state on client online
                args = this.addPlayersData(args, player);

                if (typeof args[args.length - 1] === 'function') {
                    let acknowledgement = args[args.length - 1];

                    let newAcknowledgement = async (...ackArgs) => {
                        this.currentEmitFunction = undefined;
                        this.currentEmitPlayerId = undefined;

                        let result = await acknowledgement(...ackArgs);

                        resolve(result);
                    };

                    this.getSocket(player).emit(event, ...args.slice(0, args.length - 1), newAcknowledgement);
                } else {
                    this.currentEmitFunction = undefined;
                    this.currentEmitPlayerId = undefined;

                    this.getSocket(player).emit(event, ...args);

                    resolve(undefined);
                }
            };

            this.currentEmitFunction = emitFunction;
            this.currentEmitPlayerId = player.id;

            if (this.getSocket(player) !== undefined && !this.getSocket(player).disconnected)
                emitFunction();
        });
    }

    emitToCurrentPlayerAndWait(event: string, ...args): Promise<any> {
        return this.emitToPlayerAndWait(this.currentPlayer, event, ...args);
    }

    tryToEmitEvent(player: Player) {
        if (this.currentEmitPlayerId !== player.id)
            return;

        if (this.getSocketById(this.currentEmitPlayerId) === undefined || this.getSocketById(this.currentEmitPlayerId).disconnected)
            return;

        this.currentEmitFunction();
    }

    getPlayerById(id: number): Player {
        return this.players.filter(p => p.id === id)[0];
    }

    createPlayer(user: User): Player {
        let player = new Player();

        player.id = user.id;
        player.name = user.login;
        player.spaceship = new Spaceship(this.gameData.popMainModule());
        player.hand = this.gameData.popModuleCards(this.gameData.startCardsCount);

        return player;
    }

    playerConnected(player: Player, socketId: string) {
        console.log(`Player ${player.name} connected`);

        player.socketId = socketId;
        player.online = true;

        this.changePlayerData(player);

        this.syncPlayersData();

        this.tryToEmitEvent(player);
    }

    async start() {
        console.log("Spaceships started");

        this.state = GameState.STARTED;

        while (this.state === GameState.STARTED) {
            this.syncPlayersData();

            await this.makeGameIteration();

            this.currentPlayer = this.getNextTurnPlayer();
        }
    }

    changePlayerData(player: Player) {
        for (let i = 0; i < this.players.length; ++i) {
            if (this.players[i].id === player.id) {
                this.players[i] = player;
                break;
            }
        }

        if (this.currentPlayer.id === player.id)
            this.currentPlayer = player;
    }

    syncPlayersData() {
        for (let player of this.players) {
            this.getSocket(player)?.emit('setGameData', GameToGameForPlayerMapper.getDTO(this, player));
        }
    }

    getSocketById(id: number): Socket {
        return this.getSocket(this.getPlayerById(id));
    }

    getSocket(player: Player): Socket {
        return this.io.sockets.sockets.get(player.socketId);
    }

    getNextTurnPlayer() {
        let currentPlayerId = this.players.indexOf(this.currentPlayer);

        while (true) {
            currentPlayerId++;

            currentPlayerId %= this.players.length;

            if (this.players[currentPlayerId].skipNextTurn) {
                this.players[currentPlayerId].skipNextTurn = false;
                continue;
            }

            if (this.players[currentPlayerId].isLose()) {
                continue;
            }

            break;
        }

        return this.players[currentPlayerId];
    }

    getPlayerByIndex(index: number) {
        return this.players[Object.keys(this.players)[index]];
    }

    setDestroyed(player: Player) {
        player.setLose();

        this.gameData.discardCards(player.hand);
        player.hand = [];

        player.spaceship.modules = player.spaceship.modules.filter(m => !m.isMain);
        this.gameData.discardCards(player.spaceship.modules);
        player.spaceship.modules = [];

        this.changePlayerData(player);

        console.log(`${player.name} lost`);
    }

    async choosePlayerForAttack(attackReason: AttackReason): Promise<Player | void> {
        return await this.emitToCurrentPlayerAndWait('choosePlayerForAttack', attackReason, async (attackedPlayerId?: number) => {
            if (attackedPlayerId === undefined) {
                return;
            }

            return this.getPlayerById(attackedPlayerId);
        });
    }

    async attackPlayer(attackedPlayer: Player) {
        console.log(`   Player ${this.currentPlayer.name} has attacked player ${attackedPlayer.name}`);

        this.currentFight = new FightManager(this.currentPlayer, attackedPlayer, this);
        let destroyedPlayer = await this.currentFight.fight();

        this.currentFight = undefined;

        if (destroyedPlayer !== undefined) {
            console.log(`   Player ${destroyedPlayer.name} was destroyed`);
            this.setDestroyed(destroyedPlayer);
        }

        // if all players destroyed except one
        if (Object.entries(this.players).filter(([_, player]) => !player.isLose()).length === 1) {
            this.state = GameState.ENDED;
        }
    }

    async showCardsToPlayer(cards: (Module | Event)[], player: Player, showToOther: boolean) {
        if (!showToOther) {
            await this.emitToPlayerAndWait(player, 'showCardsAndWait', player.id, cards, () => {
            });
        } else {
            for (let playerToEmit of this.players) {
                if (playerToEmit.id === player.id) {
                    await this.emitToPlayerAndWait(player, 'showCardsAndWait', player.id, cards, () => {
                    });
                } else {
                    this.getSocket(playerToEmit)?.emit('showCards', player.id, cards);
                }
            }
        }
    }

    getPlayerByOffsetFromCurrent(offset: number): Player {
        let currentPlayerIndex = this.players.findIndex(p => p.id === this.currentPlayer.id);

        do {
            currentPlayerIndex = (currentPlayerIndex + Math.sign(offset) + this.players.length) % this.players.length;

            if (!this.getPlayerByIndex(currentPlayerIndex).isLose())
                offset += -Math.sign(offset);
        } while (offset !== 0);

        return this.getPlayerByIndex(currentPlayerIndex);
    }

    async askForUseModuleSecondTime(player: Player, module: ModuleTypes): Promise<boolean> {
        return await this.emitToPlayerAndWait(player, 'askForUseModuleSecondTime', module, (useSecondTime: boolean) => {
            return useSecondTime;
        });
    }

    async makeGameIteration() {
        console.log(`Turn of player ${this.currentPlayer.name}`);

        this.timeManager.addRecord(TimeRecordType.DEFAULT_TURN_STARTED, this.currentPlayer);

        this.currentPlayer.usedRepairOrAttackModuleSecondTimeOnThisTurn = false;

        for (let phase of this.phases) {
            try {
                await phase(this);
            } catch (err) {
                console.error(err);

                this.state = GameState.ERROR;
            }

            if (this.timeManager.getPlayersTime()[this.currentPlayer.id] <= 0 && this.settings.loseWhenTimeout) {
                this.currentPlayer.setLose();
            }

            if (this.currentPlayer.isLose()) {
                break;
            }

            if (this.state === GameState.ENDED || this.state === GameState.ERROR) {
                break;
            }

            this.syncPlayersData();
        }

        this.timeManager.addRecord(TimeRecordType.DEFAULT_TURN_ENDED, this.currentPlayer);

        this.syncPlayersData();
    }
}
