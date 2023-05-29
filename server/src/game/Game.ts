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

enum GameState {
    WAIT_FOR_PLAYERS,
    STARTED,
    ENDED
}

export default class Game {
    gameData: GameData;

    size: number;

    players: Player[] = [];

    currentPlayer: Player;

    io: Server;

    state: GameState = GameState.WAIT_FOR_PLAYERS;

    currentEmitPlayerLink: number;
    currentEmitFunction: () => void;

    ENERGY_TO_ATTACK_BY_COMMAND_MODULE: number = 7;
    ENERGY_TO_MOVE_DAMAGE_BY_COMMAND_MODULE: number = 4;
    ENERGY_TO_DRAG_ANOTHER_EVENT_CARD_BY_MAIN_MODULE: number = 4;
    ENERGY_TO_DRAG_ADDITIONAL_CARD_BY_MAIN_MODULE: number = 15;

    currentFight?: FightManager;

    timeManager: TimeManager;
    withTimeControl: boolean = true;

    // logger: Logger;

    constructor(size: number, io: Server) {
        // this.logger = new Logger(this);
        // this.logger.log("game created!");

        this.size = size;
        this.gameData = new GameData();

        this.io = io;

        for (let i = 0; i < size; ++i)
            this.players.push(this.createPlayer());

        this.currentPlayer = this.players[0];

        this.timeManager = new TimeManager({
            START_TIME: 5 * 60 * 1000,
            DEFAULT_TIME_INCREASE: 45 * 1000,
            FIGHT_TIME_INCREASE: 10 * 1000,
        }, this.players);
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

                this.getSocket(player).emit('chooseModuleToDealDamage', target.link, (position: Vector2) => {
                    player = this.getPlayerByLink(player.link);

                    let discardedCardIndex = player.hand.findIndex((c) => {
                        if (isModule(c))
                            return false;

                        return c.type === EventTypes.SaveCardAndThenDealDamage;
                    });
                    let discardedCard = player.hand[discardedCardIndex];
                    player.hand = player.hand.filter((c) => c != discardedCard);

                    this.changePlayerData(player);

                    let targetModule = target.spaceship.getModuleByPosition(position);

                    // TODO: add check that not main

                    let destroyed = target.spaceship.damage(targetModule, 1, false);

                    this.handleDestroyedModules(target, player, destroyed, true);

                    if (player.link === this.currentEmitPlayerLink) {
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
        target.energy = Math.min(target.energy, target.spaceship.getTotalCapacity())

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

        if (!target.spaceship.getMainModule()) {
            target.setLose();
        }
    }

    isPlayerInFight(player: Player): boolean {
        if (!this.currentFight) return false;

        return player.link === this.currentFight.first.link || player.link === this.currentFight.second.link;
    }

    addPlayersData(message: any[], player: Player) {
        if (message[0] === HAS_PLAYERS_DATA) {
            message.splice(0, 2);
        }

        message.unshift(HAS_PLAYERS_DATA, GameToGameForPlayerMapper.getDTO(this, player.link));

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
                        this.currentEmitPlayerLink = undefined;

                        let result = await acknowledgement(...ackArgs);

                        resolve(result);
                    };

                    this.getSocketByLink(player.link).emit(event, ...args.slice(0, args.length - 1), newAcknowledgement);
                } else {
                    this.currentEmitFunction = undefined;
                    this.currentEmitPlayerLink = undefined;

                    this.getSocketByLink(player.link).emit(event, ...args);

                    resolve(undefined);
                }
            };

            this.currentEmitFunction = emitFunction;
            this.currentEmitPlayerLink = player.link;

            if (this.getSocketByLink(player.link) !== undefined && !this.getSocketByLink(player.link).disconnected)
                emitFunction();
        });
    }

    emitToCurrentPlayerAndWait(event: string, ...args): Promise<any> {
        return this.emitToPlayerAndWait(this.currentPlayer, event, ...args);
    }

    tryToEmitEvent(link: number) {
        if (this.currentEmitPlayerLink !== link)
            return;

        if (this.getSocketByLink(this.currentEmitPlayerLink) === undefined || this.getSocketByLink(this.currentEmitPlayerLink).disconnected)
            return;

        this.currentEmitFunction();
    }

    getLinks(): number[] {
        return this.players.map(p => p.link);
    }

    getPlayerByLink(link: number): Player {
        return this.players.filter(p => p.link === link)[0];
    }

    createPlayer(): Player {
        let player = new Player();
        player.spaceship = new Spaceship(this.gameData.popMainModule());
        player.hand = this.gameData.popModuleCards(this.gameData.startCardsCount);

        return player;
    }

    playerConnected(link: number, socketId: string): Player {
        console.log(`User with link ${link} connected`);

        let connectedPlayer = this.getPlayerByLink(link);

        connectedPlayer.socketId = socketId;
        connectedPlayer.online = true;

        this.changePlayerData(connectedPlayer);

        this.addUseEventCardEvent(connectedPlayer);

        this.syncPlayersData();

        this.tryToEmitEvent(link);

        return connectedPlayer;
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
            if (this.players[i].link === player.link) {
                this.players[i] = player;
                break;
            }
        }

        if (this.currentPlayer.link === player.link)
            this.currentPlayer = this.getPlayerByLink(player.link);
    }

    syncPlayersData() {
        for (let player of this.players) {
            this.getSocket(player)?.emit('setGameData', GameToGameForPlayerMapper.getDTO(this, player.link));
        }
    }

    getSocketByLink(link: number): Socket {
        return this.getSocket(this.getPlayerByLink(link));
    }

    getSocket(value: Player): Socket {
        return this.io.sockets.sockets.get(value.socketId);
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
        let destroyedPlayerData = this.getPlayerByLink(player.link);

        destroyedPlayerData.setLose();

        this.changePlayerData(destroyedPlayerData);

        console.log(`Player ${destroyedPlayerData.link} lose`);
    }

    end() {
        let winner = Object.entries(this.players).filter(([_, player]) => !player.isLose())[0][1];

        console.log(`Game end. Player ${winner.link} has won`);

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

        this.changePlayerData(player);
    }

    async useRepairModule(energyCost: number): Promise<boolean> {
        return await this.emitToCurrentPlayerAndWait('chooseModuleToRepair', async (modulePosition?: Vector2) => {
            if (!modulePosition)
                return false;

            let module = this.currentPlayer.spaceship.getModuleByPosition(modulePosition);
            let repairModule = this.currentPlayer.spaceship.getModulesByType(ModuleTypes.RepairModule)[0];

            this.currentPlayer.energy -= energyCost;
            module.health = Math.min(module.health + 2, module.totalHealth);

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

            console.log("   Player use repair module for second time");

            this.currentPlayer.usedRepairOrAttackModuleSecondTimeOnThisTurn = true;

            await this.useRepairModule(repairModuleCost * 2);
        }
    }

    async attackPhase() {
        console.log("   Player asked for attack");

        let attackedPlayer = await this.choosePlayerForAttack(AttackReason.AttackModule);

        if (!attackedPlayer) {
            console.log(`   Player ${this.currentPlayer.link} is peaceful`);

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
        return await this.emitToCurrentPlayerAndWait('choosePlayerForAttack', attackReason, async (attackedPlayerLink?: number) => {
            if (attackedPlayerLink === undefined) {
                return;
            }

            return this.getPlayerByLink(attackedPlayerLink);
        });
    }

    async attackPlayer(attackedPlayer: Player) {
        console.log(`   Player ${this.currentPlayer.link} has attacked player ${attackedPlayer.link}`);

        this.currentFight = new FightManager(this.currentPlayer, attackedPlayer, this);
        let destroyedPlayer = await this.currentFight.fight();

        this.currentFight = undefined;

        if (destroyedPlayer !== undefined) {
            console.log(`   Player ${destroyedPlayer.link} was destroyed`);
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
                let drawAdditional: boolean;

                do {
                    drawAdditional = false;
                    let module = this.gameData.popModuleCards(1)[0];

                    console.log(`   Player get module: ${module.name}`);

                    await this.showCardsToPlayer([module], this.currentPlayer, true);

                    console.log("here");

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

    showCardsToPlayer(cards: (Module | Event)[], player: Player, showToOther: boolean) {
        if (!showToOther) {
            this.getSocket(player)?.emit('showCards', player.link, cards);
        } else {
            for (let playerToEmit of this.players) {
                this.getSocket(playerToEmit)?.emit('showCards', player.link, cards);
            }
        }
    }

    getPlayerByOffsetFromCurrent(offset: number): Player {
        let currentPlayerId = this.players.findIndex(p => p.link === this.currentPlayer.link);

        do {
            currentPlayerId = (currentPlayerId + Math.sign(offset) + this.players.length) % this.players.length;

            if (!this.getPlayerByIndex(currentPlayerId).isLose())
                offset += -Math.sign(offset);
        } while (offset !== 0);

        return this.getPlayerByIndex(currentPlayerId);
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
        console.log(`Turn of player ${this.currentPlayer.link}`);

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