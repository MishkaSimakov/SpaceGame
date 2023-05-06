import Player from "../../common/Player";
import GameData from "./GameData";
import Spaceship from "../../common/Spaceship";
import SpaceSolver from "../../common/modules/SpaceSolver";
import {Server, Socket} from "socket.io";
import {plainToClass} from "../../common/PlainToClass";
import FightManager from "./Fight/FightManager";
import Module, {isModule, ModuleTypes} from "../../common/modules/Module";
import {Event, EventTypes} from "../../common/events/Event";
import performEvent from "./EventsPerformManager";
import SolarPanel from "../../common/modules/SolarPanel";
import {MainModuleType} from "../../common/modules/MainModule";
import {AttackReason, MoveDamageReason} from "../../common/Types";
import Vector2 from "../../common/Vector2";

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
    ENERGY_TO_DRAG_ADDITIONAL_CARD_BY_MAIN_MODULE: number = 4;

    constructor(size: number, io: Server) {
        this.size = size;
        this.gameData = new GameData();

        this.io = io;

        for (let i = 0; i < size; ++i)
            this.players.push(this.createPlayer());

        this.currentPlayer = this.players[0];
    }

    addUseEventCardEvent(link: number) {
        this.getSocketByLink(link).on('useEventCard', (event: Event, callback: (isAccepted: boolean) => void) => {
            callback(true);
        });
    }

    emitToPlayerAndWait(player: Player, event: string, ...args): Promise<any> {
        return new Promise(resolve => {
            // generate function that must be called when player connected

            let emitFunction = () => {
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

    tryToEmitEvent() {
        if (this.currentEmitPlayerLink === undefined)
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

        //  create spaceship
        player.spaceship = new Spaceship(this.gameData.popMainModule());
        player.spaceship.addModule(new SpaceSolver(1, 1, 1, 1), 1, 0);
        player.spaceship.addModule(new SolarPanel(1, 1, 1, 1), 2, 0);

        player.spaceship.getModuleByPosition(1, 0).health -= 5;

        player.hand = this.gameData.popModuleCards(this.gameData.startCardsCount);
        player.hand.push(...this.gameData.popEventCards(1));

        return player;
    }

    playerConnected(link: number, socketId: string): Player {
        console.log(`User with link ${link} connected`);

        // check whether player connected for the first time
        let connectedPlayer = this.getPlayerByLink(link);

        // set socket id
        connectedPlayer.socketId = socketId;

        connectedPlayer.online = true;

        this.addUseEventCardEvent(link);

        this.updatePlayersStatus();
        this.setPlayersData();

        return connectedPlayer;
    }

    updatePlayersStatus() {
        this.io.emit('setPlayersStatus', this.players.map(p => {
            return {link: p.link, online: p.online}
        }));
    }

    async start() {
        console.log("Spaceships started");

        this.state = GameState.STARTED;

        while (this.state === GameState.STARTED) {
            this.setPlayersData();

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

    setPlayersData() {
        this.io.emit('setPlayersData', this.players);
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

        await this.emitToPlayerAndWait(this.currentPlayer, 'rebuildSpaceship', this.currentPlayer, (changedPlayer: Player) => {
            this.setRebuildSpaceshipData(plainToClass(changedPlayer, Player.getPropertiesMap()));

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

    async fixSpaceshipPhase() {
        // TODO: use module second time

        console.log("   Player asked for repair spaceship")

        await this.emitToPlayerAndWait(this.currentPlayer, 'chooseModuleToRepair', (modulePosition?: [number, number]) => {
            if (modulePosition !== undefined) {
                let module = this.currentPlayer.spaceship.getModuleByPosition(...modulePosition);
                let repairModule = this.currentPlayer.spaceship.getModulesByType(ModuleTypes.RepairModule)[0];

                this.currentPlayer.energy -= repairModule.energyCost;
                module.health = Math.min(module.health + 2, module.totalHealth);
            }
        });
    }

    async attackPhase() {
        console.log("   Player asked for attack");

        let attackedPlayer = await this.choosePlayerForAttack(AttackReason.AttackModule);

        if (!attackedPlayer) {
            console.log(`   Player ${this.currentPlayer.link} is peaceful`);

            return undefined;
        }

        await this.attackPlayer(attackedPlayer);

        if (this.currentPlayer.spaceship.getMainModuleType() === MainModuleType.UseModuleSecondTime) {
            let useSecondTime = this.askForUseModuleForSecondTime(this.currentPlayer, ModuleTypes.AttackModule);


        }
    }

    async choosePlayerForAttack(attackReason: AttackReason): Promise<Player | void> {
        return await this.emitToPlayerAndWait(this.currentPlayer, 'choosePlayerForAttack', attackReason, async (attackedPlayerLink?: number) => {
            if (attackedPlayerLink === undefined) {
                return;
            }

            return this.getPlayerByLink(attackedPlayerLink);
        });
    }

    async attackPlayer(attackedPlayer: Player) {
        console.log(`   Player ${this.currentPlayer.link} has attacked player ${attackedPlayer.link}`);

        this.currentPlayer.isInFight = true;
        this.getPlayerByLink(this.currentPlayer.link).isInFight = true;

        attackedPlayer.isInFight = true;

        let destroyedPlayer = await (new FightManager(this.currentPlayer, attackedPlayer, this)).fight();

        this.currentPlayer.isInFight = false;
        this.getPlayerByLink(this.currentPlayer.link).isInFight = false;

        attackedPlayer.isInFight = false;

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

        return await this.emitToPlayerAndWait(this.currentPlayer, 'chooseCardType', async (cardType: string) => {
            console.log(`   Player choose ${cardType} card`);

            if (cardType === 'event') {
                let event: Event;
                let drawAnother: boolean;

                do {
                    drawAnother = false;

                    event = this.gameData.popEventCards()[0];

                    await this.showCardToPlayer(event, this.currentPlayer);

                    console.log(`   Player get event card: ${event.description}`);

                    if (this.currentPlayer.spaceship.getMainModuleType() === MainModuleType.DrawAnotherEventCard
                        && this.currentPlayer.energy >= this.ENERGY_TO_DRAG_ANOTHER_EVENT_CARD_BY_MAIN_MODULE) {
                        await this.emitToCurrentPlayerAndWait('drawAnotherEventCard', (drawAnotherEventCard: boolean) => {
                            if (!drawAnotherEventCard)
                                return;

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

                    await this.showCardToPlayer(module, this.currentPlayer);

                    this.currentPlayer.hand.push(module);

                    if (this.currentPlayer.spaceship.getMainModuleType() === MainModuleType.DrawAdditionalModuleCard
                        && this.currentPlayer.energy >= this.ENERGY_TO_DRAG_ADDITIONAL_CARD_BY_MAIN_MODULE) {
                        await this.emitToCurrentPlayerAndWait('drawAdditionalModuleCard', (drawAdditionalModuleCard: boolean) => {
                            if (!drawAdditionalModuleCard)
                                return;

                            drawAdditional = true;

                            console.log(`   Player draw additional module card`);
                        });
                    }
                } while (drawAdditional);
            }

            this.changePlayerData(this.currentPlayer);
            this.setPlayersData();
        });
    }

    async discardExtraCardsPhase() {
        console.log("   Player asked to discard cards");

        await this.emitToPlayerAndWait(this.currentPlayer, 'discardCards', (discardedCardsIndexes: number[]) => {
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
            this.setPlayersData();
        });
    }

    async showCardToPlayer(card: Module | Event, player: Player) {
        await this.emitToPlayerAndWait(player, 'showCard', card);
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

    async askForUseModuleForSecondTime(player: Player, module: ModuleTypes): Promise<boolean> {
        return await this.emitToPlayerAndWait(player, 'askForUseModuleForSecondTime', module, (useForSecondTime: boolean) => {
            return useForSecondTime;
        });
    }

    async makeGameIteration() {
        // set current turn player
        console.log(`Turn of player ${this.currentPlayer.link}`);

        await this.beforeTurn();

        // collect energy
        this.collectEnergyPhase();

        // rebuild spaceship
        await this.rebuildSpaceshipPhase();

        // fix spaceship
        if (this.currentPlayer.spaceship.hasRepairModule())
            await this.fixSpaceshipPhase();

        // ask for attack
        if (this.currentPlayer.spaceship.canAttack()) {
            await this.attackPhase();

            if (this.state === GameState.ENDED)
                return;
        }

        // take cards
        await this.drawCardsPhase();

        // discard extra cards
        if (this.currentPlayer.hand.length > 5)
            await this.discardExtraCardsPhase();
    }
}