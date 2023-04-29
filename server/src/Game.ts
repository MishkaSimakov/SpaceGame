import Player from "../../common/Player";
import GameData from "./GameData";
import Spaceship from "../../common/Spaceship";
import SpaceSolver from "../../common/modules/SpaceSolver";
import {Server, Socket} from "socket.io";
import {plainToClass} from "../../common/PlainToClass";
import FightManager from "./Fight/FightManager";
import Module, {ModuleTypes} from "../../common/modules/Module";
import {Event} from "../../common/events/Event";
import {MainModuleType} from "../../common/modules/MainModule";
import performEvent from "./EventsPerformManager";

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

    constructor(size: number, io: Server) {
        this.size = size;
        this.gameData = new GameData();

        this.io = io;

        for (let i = 0; i < size; ++i)
            this.players.push(this.createPlayer());

        this.currentPlayer = this.players[0];
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

        player.hand = this.gameData.popModuleCards(this.gameData.startCardsCount);

        return player;
    }

    playerConnected(link: number, socketId: string): Player {
        console.log(`User with link ${link} connected`);

        // check whether player connected for the first time
        let connectedPlayer = this.getPlayerByLink(link);

        // set socket id
        connectedPlayer.socketId = socketId;

        connectedPlayer.online = true;

        this.updatePlayersStatus();

        return connectedPlayer;
    }

    updatePlayersStatus() {
        this.io.emit('setPlayersStatus', this.players.map(p => {
            return {link: p.link, online: p.online}
        }));
    }

    async start() {
        console.log("Game started");

        this.state = GameState.STARTED;

        while (true) {
            this.setPlayersData();

            let isGameContinue = await this.makeGameIteration();

            if (!isGameContinue)
                break;

            this.currentPlayer = this.getNextTurnPlayer();
        }

        this.state = GameState.ENDED;
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
        let winner = Object.entries(this.players).filter(([key, player]) => !player.isLose())[0][1];

        console.log(`Game end. Player ${winner.link} has won`);
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

    async attackPhase(): Promise<Player | undefined> {
        console.log("   Player asked for attack")

        return await this.emitToPlayerAndWait(this.currentPlayer, 'willYouFight', async (attackedPlayerLink?: number) => {
            if (attackedPlayerLink === null) {
                console.log(`   Player ${this.currentPlayer.link} is peaceful`);

                return undefined;
            }

            console.log(`   Player ${this.currentPlayer.link} has attacked player ${attackedPlayerLink}`);

            let target = this.getPlayerByLink(attackedPlayerLink);
            return await (new FightManager(this.currentPlayer, target, this)).fight();
        });
    }

    async drawCardsPhase() {
        console.log("   Player asked to choose card type");

        return await this.emitToPlayerAndWait(this.currentPlayer, 'chooseCardType', async (cardType: string) => {
            console.log(`   Player choose ${cardType} card`);

            if (cardType === 'event') {
                let event: Event = this.gameData.popEventCard();

                this.showCardToPlayer(event, this.currentPlayer);

                console.log(`   Player get event card: ${event.description}. Start performing`);

                await performEvent(event, this);

                this.showCardToPlayer(event, this.currentPlayer);

                console.log(`   Event performed`);
            } else if (cardType === 'module') {
                let module = this.gameData.popModuleCards(1)[0];

                console.log(`   Player get module: ${module.name}`);

                this.showCardToPlayer(module, this.currentPlayer);

                this.currentPlayer.hand.push(module);
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

    showCardToPlayer(card: Module | Event, player: Player) {
        this.getSocket(player).emit('showCard', card);
    }

    getPlayerByOffsetFromCurrent(offset: number): Player {
        let currentPlayerId = Object.keys(this.players).indexOf(this.currentPlayer.socketId);

        do {
            currentPlayerId += Math.sign(offset);

            if (!this.getPlayerByIndex(currentPlayerId).isLose())
                offset += -Math.sign(offset);

            if (currentPlayerId === Object.keys(this.players).length || currentPlayerId === -1)
                currentPlayerId = 0;
        } while (offset !== 0);

        return this.getPlayerByIndex(currentPlayerId);
    }

    async makeGameIteration(): Promise<boolean> {
        // set current turn player
        console.log(`Turn of player ${this.currentPlayer.link}`);

        // collect energy
        this.collectEnergyPhase();

        // rebuild spaceship
        await this.rebuildSpaceshipPhase();

        // fix spaceship
        if (this.currentPlayer.spaceship.hasRepairModule())
            await this.fixSpaceshipPhase();

        // ask for attack
        if (this.currentPlayer.spaceship.getMainModule().mainModuleType === MainModuleType.AttackOrRunaway) {
            let destroyedPlayer = await this.attackPhase();

            if (destroyedPlayer !== undefined) {
                console.log(`   Player ${destroyedPlayer.link} was destroyed`);
                this.setDestroyed(destroyedPlayer);
            }

            if (Object.entries(this.players).filter(([key, player]) => !player.isLose()).length === 1) {
                this.end();

                return false;
            }
        }


        if (this.currentPlayer.spaceship.canAttack()) {
            let destroyedPlayer = await this.attackPhase();

            if (destroyedPlayer !== undefined) {
                console.log(`   Player ${destroyedPlayer.link} was destroyed`);
                this.setDestroyed(destroyedPlayer);
            }

            if (Object.entries(this.players).filter(([key, player]) => !player.isLose()).length === 1) {
                this.end();

                return false;
            }
        }

        // take cards
        await this.drawCardsPhase();

        // discard extra cards
        if (this.currentPlayer.hand.length > 5)
            await this.discardExtraCardsPhase();

        return true;
    }
}