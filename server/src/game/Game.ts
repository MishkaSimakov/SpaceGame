import Player from "../../../common/Player";
import GameData from "./GameData";
import Spaceship from "../../../common/Spaceship";
import {Server, Socket} from "socket.io";
import {plainToClass} from "../../../common/PlainToClass";
import FightManager from "./FightManager";
import Module, {isModule, ModuleTypes} from "../../../common/modules/Module";
import {Event, EventTypes} from "../../../common/events/Event";
import performEvent from "./EventsPerformManager";
import {MainModuleType} from "../../../common/modules/MainModule";
import {AttackReason, MoveDamageReason} from "../../../common/Types";
import Vector2 from "../../../common/Vector2";
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

enum GameState {
    WAIT_FOR_PLAYERS,
    STARTED,
    ENDED
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

    steps: Array<(game: Game) => void> = [
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

    addUseEventCardEvent(player: Player) {
        this.getSocket(player).on('useEventCard', async (event: Event, callback: (isAccepted: boolean) => void) => {
            if (event.type === EventTypes.SaveCardAndThenDealDamage) {
                if (!this.isPlayerInFight(player)) {
                    callback(false);
                    return;
                }

                let target = this.currentFight.getEnemyOf(player);

                if (target.spaceship.modules.length === 1) {
                    callback(false);
                    return;
                }

                callback(true);

                this.getSocket(player).emit('chooseModuleToDealDamage', target.id, (position: Vector2) => {
                    this.messageManager.addMessage(`нанёс 1 урон ${target.id} картой действия`, player);

                    player = this.getPlayerById(player.id);

                    let discardedCardIndex = player.hand.findIndex((c) => {
                        if (isModule(c))
                            return false;

                        return c.type === EventTypes.SaveCardAndThenDealDamage;
                    });
                    let discardedCard = player.hand[discardedCardIndex];
                    player.hand = player.hand.filter((c) => c != discardedCard);

                    this.changePlayerData(player);

                    let targetModule = target.spaceship.getModuleByPosition(position);

                    let destroyed = target.spaceship.damage(targetModule, 1, false);

                    this.handleDestroyedModules(target, player, destroyed, true);

                    if (player.id === this.currentEmitPlayerId) {
                        this.currentEmitFunction();
                    }
                });
            }
        });
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

        this.addUseEventCardEvent(player);

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

    end() {
        let winner = Object.entries(this.players).filter(([_, player]) => !player.isLose())[0][1];

        console.log(`Game end. Player ${winner.name} has won`);

        this.state = GameState.ENDED;
    }

    collectEnergyPhase() {
        this.currentPlayer.collectEnergy();

        this.changePlayerData(this.currentPlayer);

        console.log("   Player received energy");
    }

    async rebuildSpaceshipPhase() {
        console.log("   Player start rebuilding spaceship");

        await this.emitToCurrentPlayerAndWait('rebuildSpaceship', (changedPlayer: Player) => {
            this.setRebuildSpaceshipData(plainToClass(changedPlayer, Player.getPropertiesMap()));

            this.syncPlayersData();

            console.log("   Player end rebuilding spaceship");
        });
    }

    setRebuildSpaceshipData(player: Player) {
        if (this.currentPlayer.socketId !== player.socketId) {
            throw new Error("Wrong player has rebuilt spaceship");
        }

        if (!this.currentPlayer.canBeTurnedInto(player)) {
            throw new Error("Changed player has wrong cards or energy count");
        }

        if (!Spaceship.checkConfiguration(player.spaceship)) {
            throw new Error("Changed player has wrong spaceship configuration");
        }

        player.energy = Math.min(player.energy, player.spaceship.getTotalCapacity());

        this.changePlayerData(player);
    }

    async useRepairModule(energyCost: number): Promise<boolean> {
        return await this.emitToCurrentPlayerAndWait('chooseModuleToRepair', async (modulePosition?: Vector2) => {
            if (!modulePosition)
                return false;

            this.messageManager.addMessage(`починился ремонтным модулем`, this.currentPlayer);

            let module = this.currentPlayer.spaceship.getModuleByPosition(modulePosition);

            this.currentPlayer.energy -= energyCost;
            module.health = Math.min(module.health + 1, module.totalHealth);

            return true;
        });
    }

    async fixSpaceshipPhase() {
        console.log("   Player asked for repair spaceship")

        let repairModuleCost = this.currentPlayer.spaceship.getModulesByType(ModuleTypes.RepairModule)[0].energyCost;

        let isRepaired = await this.useRepairModule(repairModuleCost);

        if (!this.currentPlayer.usedRepairOrAttackModuleSecondTimeOnThisTurn && isRepaired
            && this.currentPlayer.spaceship.getMainModuleType() === MainModuleType.UseModuleSecondTime
            && this.currentPlayer.spaceship.hasDamagedModules()
            && this.currentPlayer.energy >= repairModuleCost * 2
        ) {
            let useSecondTime = await this.askForUseModuleSecondTime(this.currentPlayer, ModuleTypes.RepairModule);

            if (!useSecondTime)
                return;

            this.messageManager.addMessage(`починился ремонтным модулем x2`, this.currentPlayer);
            console.log("   Player use repair module for second time");

            this.currentPlayer.usedRepairOrAttackModuleSecondTimeOnThisTurn = true;

            await this.useRepairModule(repairModuleCost * 2);
        }
    }

    async attackPhase() {
        console.log("   Player asked for attack");

        let attackedPlayer = await this.choosePlayerForAttack(AttackReason.AttackModule);

        if (!attackedPlayer) {
            console.log(`   Player ${this.currentPlayer.name} is peaceful`);

            return;
        }

        let energyCost = this.currentPlayer.spaceship.getModulesByType(ModuleTypes.AttackModule)[0].energyCost;
        this.currentPlayer.energy -= energyCost;

        await this.attackPlayer(attackedPlayer);

        if (!this.currentPlayer.usedRepairOrAttackModuleSecondTimeOnThisTurn
            && this.currentPlayer.spaceship.getMainModuleType() === MainModuleType.UseModuleSecondTime
            && this.currentPlayer.energy >= energyCost * 2) {
            let useSecondTime = await this.askForUseModuleSecondTime(this.currentPlayer, ModuleTypes.AttackModule);

            if (!useSecondTime)
                return;

            console.log("   Player use attack module for second time");

            this.currentPlayer.energy -= energyCost * 2;
            this.currentPlayer.usedRepairOrAttackModuleSecondTimeOnThisTurn = true;

            let attackedPlayer = await this.choosePlayerForAttack(AttackReason.UsingAttackModuleSecondTime);

            if (!attackedPlayer) {
                throw new Error('Attacked player is undefined in UsingAttackModuleSecondTime');
            }

            await this.attackPlayer(attackedPlayer);
        }
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
            this.end();
        }
    }

    async drawCardsPhase() {
        console.log("   Player asked to choose card type");

        return await this.emitToCurrentPlayerAndWait('chooseCardType', async (cardType: string) => {
            console.log(`   Player choose ${cardType} card`);

            if (cardType === 'event') {
                let event: Event;
                let drawAnother: boolean;

                do {
                    drawAnother = false;

                    event = this.gameData.popEventCards()[0];

                    await this.showCardsToPlayer([event], this.currentPlayer, true);

                    console.log(`   Player get event card: ${event.description.replace("\n", " ")}`);

                    if (this.currentPlayer.spaceship.getMainModuleType() === MainModuleType.DrawAnotherEventCard
                        && this.currentPlayer.energy >= this.ENERGY_TO_DRAG_ANOTHER_EVENT_CARD_BY_MAIN_MODULE) {
                        await this.emitToCurrentPlayerAndWait('drawAnotherEventCard', (drawAnotherEventCard: boolean) => {
                            if (!drawAnotherEventCard)
                                return;

                            this.currentPlayer.energy -= this.ENERGY_TO_DRAG_ANOTHER_EVENT_CARD_BY_MAIN_MODULE;

                            this.gameData.discardCards([event]);
                            drawAnother = true;

                            console.log(`   Player draw another event card`);
                        });
                    }
                } while (drawAnother);

                console.log(`   Performing event`);

                await performEvent(event, this);

                console.log(`   Event performed`);
            } else if (cardType === 'module') {
                // TODO: do later
                let drawAdditional: boolean;

                do {
                    drawAdditional = false;
                    let module = this.gameData.popModuleCards(1)[0];

                    console.log(`   Player get module: ${module.name}`);

                    await this.showCardsToPlayer([module], this.currentPlayer, true);

                    this.currentPlayer.hand.push(module);

                    if (this.currentPlayer.spaceship.getMainModuleType() === MainModuleType.DrawAdditionalModuleCard
                        && this.currentPlayer.energy >= this.ENERGY_TO_DRAG_ADDITIONAL_CARD_BY_MAIN_MODULE) {
                        await this.emitToCurrentPlayerAndWait('drawAdditionalModuleCard', (drawAdditionalModuleCard: boolean) => {
                            if (!drawAdditionalModuleCard)
                                return;

                            this.currentPlayer.energy -= this.ENERGY_TO_DRAG_ADDITIONAL_CARD_BY_MAIN_MODULE;
                            drawAdditional = true;

                            console.log(`   Player draw additional module card`);
                        });
                    }
                } while (drawAdditional);
            }

            this.changePlayerData(this.currentPlayer);
            this.syncPlayersData();
        });
    }

    async discardExtraCardsPhase() {
        console.log("   Player asked to discard cards");

        await this.emitToCurrentPlayerAndWait('discardCards', (discardedCardsIndexes: number[]) => {
            console.log(`   Player discarded cards with indexes ${discardedCardsIndexes.join(', ')}`);

            if (this.currentPlayer.hand.length - discardedCardsIndexes.length > 5)
                throw new Error('Player discarded not enough cards')

            let discardedCards = discardedCardsIndexes.map((index) => {
                return this.currentPlayer.hand[index];
            })

            for (let discardedCard of discardedCards) {
                this.currentPlayer.hand = this.currentPlayer.hand.filter((c) => c !== discardedCard);
            }

            this.gameData.discardCards(discardedCards);

            this.changePlayerData(this.currentPlayer);
            this.syncPlayersData();
        });
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

    async beforeTurn() {
        // attack by event card
        if (this.currentPlayer.hand.filter((m) => {
            if (isModule(m))
                return false;

            return (m as Event).type === EventTypes.SaveCardAndThenAttack;
        }).length !== 0) {
            let attackedPlayer: Player | void = await this.choosePlayerForAttack(AttackReason.AttackLaterEventCard);

            if (attackedPlayer) {
                let eventCardIndex: number = this.currentPlayer.hand.findIndex((c) => {
                    if (isModule(c)) return false;

                    return (c as Event).type === EventTypes.SaveCardAndThenAttack;
                });

                let discardedEventCard = this.currentPlayer.hand.splice(eventCardIndex, 1);
                this.gameData.discardCards(discardedEventCard);

                await this.attackPlayer(attackedPlayer);
            }
        }

        // attack by command module
        if (this.currentPlayer.spaceship.getMainModuleType() === MainModuleType.AttackOrRunaway
            && this.currentPlayer.energy >= this.ENERGY_TO_ATTACK_BY_COMMAND_MODULE) {
            let attackedPlayer: Player | void = await this.choosePlayerForAttack(AttackReason.MainModule);

            if (attackedPlayer) {
                this.currentPlayer.energy -= this.ENERGY_TO_ATTACK_BY_COMMAND_MODULE;

                await this.attackPlayer(attackedPlayer);
            }
        }

        // repair module by command module
        if (this.currentPlayer.spaceship.getMainModuleType() === MainModuleType.MoveDamage
            && this.currentPlayer.energy >= this.ENERGY_TO_MOVE_DAMAGE_BY_COMMAND_MODULE
            && this.currentPlayer.spaceship.hasDamagedModules()) {

            type MoveData = {
                from: Vector2,
                to: Vector2
            }

            let moveDamageData: MoveData = await this.emitToCurrentPlayerAndWait('chooseModulesToMoveDamage', MoveDamageReason.MainModule, (moveDamage?: MoveData) => {
                return moveDamage;
            });

            if (moveDamageData) {
                let moduleToMoveDamageFrom: Module = this.currentPlayer.spaceship.getModuleByPosition(moveDamageData.from);
                let moduleToMoveDamageTo: Module = this.currentPlayer.spaceship.getModuleByPosition(moveDamageData.to);

                let newHealth = Math.min(moduleToMoveDamageFrom.totalHealth, moduleToMoveDamageFrom.health + 2);

                moduleToMoveDamageTo.health -= newHealth - moduleToMoveDamageFrom.health;
                moduleToMoveDamageFrom.health = newHealth;

                if (moduleToMoveDamageTo.health <= 0) {
                    this.currentPlayer.spaceship.removeModule(moduleToMoveDamageTo);

                    let unconnected = this.currentPlayer.spaceship.getUnconnectedModules();
                    this.currentPlayer.spaceship.removeModule(unconnected);

                    this.currentPlayer.hand.push(...unconnected);

                    moduleToMoveDamageTo.health = moduleToMoveDamageTo.totalHealth;
                    this.gameData.discardCards([moduleToMoveDamageTo]);
                }
            }
        }
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

        await this.beforeTurn();

        // collect energy
        this.collectEnergyPhase();

        this.syncPlayersData();

        // rebuild spaceship
        await this.rebuildSpaceshipPhase();

        // fix spaceship
        if (this.currentPlayer.spaceship.hasRepairModule() && this.currentPlayer.spaceship.hasDamagedModules() && this.currentPlayer.energy >= 2)
            await this.fixSpaceshipPhase();

        // ask for attack
        if (this.currentPlayer.spaceship.canAttack() && this.currentPlayer.energy >= 5) {
            await this.attackPhase();

            if (this.state === GameState.ENDED)
                return;
        }

        // take cards
        await this.drawCardsPhase();

        // discard extra cards
        if (this.currentPlayer.hand.length > 5)
            await this.discardExtraCardsPhase();

        this.timeManager.addRecord(TimeRecordType.DEFAULT_TURN_ENDED, this.currentPlayer);
    }
}
