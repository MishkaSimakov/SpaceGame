import Player from "../common/Player";
import GameData from "./GameData";
import Spaceship from "../common/Spaceship";
import SpaceSolver from "../common/modules/SpaceSolver";
import {TurnPhase} from "../common/TurnPhase";
import {Server, Socket} from "socket.io";
import {plainToClass} from "../common/PlainToClass";
import FightManager from "./FightManager";
import Module from "../common/modules/Module";
import {Event, performEvent} from "../common/events/Event";

export default class Game {
    gameData: GameData;

    size: number;

    players: Record<string, Player> = {};
    currentPlayer: Player;

    turnPhase: TurnPhase;

    io: Server;

    constructor(size: number, io: Server) {
        this.size = size;
        this.gameData = new GameData();

        this.io = io;
    }

    addPlayer(id: string): Player {
        let player = new Player(id, new Spaceship(this.gameData.popMainModule()));
        player.spaceship.addModule(new SpaceSolver(1, 1, 1, 1), 1, 0);

        player.hand = this.gameData.popModuleCards(this.gameData.startCardsCount);

        this.players[id] = player;

        if (this.currentPlayer === undefined)
            this.currentPlayer = player;

        console.log(`User connected (${Object.keys(this.players).length}/${this.size})`);

        return player;
    }

    start() {
        console.log("Game started");

        this.turnPhase = TurnPhase.RebuildSpaceship;
    }

    changePlayerData(player: Player): boolean {
        if (this.players[player.id] === undefined)
            return false;

        this.players[player.id] = player;

        if (this.currentPlayer.id === player.id)
            this.currentPlayer = this.players[player.id];

        return true;
    }

    setPlayersData() {
        this.io.emit('setPlayersData', this.players);
    }

    isFull(): boolean {
        return Object.keys(this.players).length === this.size;
    }

    getSocket(player: Player): Socket;
    getSocket(id: string): Socket;
    getSocket(value: Player | string): Socket {
        if (typeof value === 'string')
            return this.io.sockets.sockets.get(value);

        return this.io.sockets.sockets.get(value.id);
    }

    getNextTurnPlayer() {
        let currentPlayerId = Object.keys(this.players).indexOf(this.currentPlayer.id);

        do {
            currentPlayerId++;

            if (currentPlayerId === Object.keys(this.players).length)
                currentPlayerId = 0;
        } while (this.getPlayerByIndex(currentPlayerId).isLose());

        return this.getPlayerByIndex(currentPlayerId);
    }

    getPlayerByIndex(index: number) {
        return this.players[Object.keys(this.players)[index]];
    }

    setDestroyed(player: Player) {
        let destroyedPlayerData = this.players[player.id];

        destroyedPlayerData.setLose();

        this.changePlayerData(destroyedPlayerData);

        console.log(`Player ${destroyedPlayerData.id} lose`);
    }

    end() {
        let winner = Object.entries(this.players).filter(([key, player]) => !player.isLose())[0][1];

        console.log(`Game end. Player ${winner.id} has won`);
    }

    collectEnergyPhase() {
        this.currentPlayer.collectEnergy();

        this.changePlayerData(this.currentPlayer);

        console.log("   Player received energy");
    }

    async rebuildSpaceshipPhase() {
        await new Promise((resolve, reject) => {
            console.log("   Player start rebuilding spaceship");

            this.getSocket(this.currentPlayer).emit('rebuildSpaceship', this.currentPlayer, (changedPlayer: Player) => {
                console.log(plainToClass(changedPlayer, Player.getPropertiesMap()).spaceship.modules.length);

                this.setRebuildSpaceshipData(plainToClass(changedPlayer, Player.getPropertiesMap()));

                console.log("   Player end rebuilding spaceship");

                resolve(true);
            });
        });
    }

    setRebuildSpaceshipData(player: Player) {
        if (this.currentPlayer.id !== player.id) {
            throw new Error("Wrong player has rebuilt spaceship");
        }

        if (this.turnPhase !== TurnPhase.RebuildSpaceship) {
            throw new Error(`Player has rebuilt his spaceship in wrong turn phase (expected: ${TurnPhase.RebuildSpaceship}, got: ${this.turnPhase})`);
        }

        if (!player.canBeTurnedInto(player)) {
            throw new Error("Changed player has wrong cards or energy count");
        }

        if (!Spaceship.checkConfiguration(player.spaceship)) {
            throw new Error("Changed player has wrong spaceship configuration");
        }

        this.changePlayerData(player);
    }

    async fixSpaceshipPhase() {
        console.log("   Player asked for repair spaceship")

        return;
    }

    async attackPhase(): Promise<{ destroyedPlayer: Player | undefined }> {
        return await new Promise((resolve, reject) => {
            console.log("   Player asked for attack")

            this.getSocket(this.currentPlayer).emit('willYouFight', (response: { attackedPlayerId?: string }) => {
                if (response.attackedPlayerId !== undefined) {
                    console.log(`   Player ${this.currentPlayer.id} has attacked player ${response.attackedPlayerId}`);

                    let fightManager = new FightManager(this.currentPlayer, this.players[response.attackedPlayerId], (destroyedPlayer) => {
                        resolve({
                            destroyedPlayer: destroyedPlayer
                        });
                    }, this);

                    fightManager.makeFightIteration();
                } else {
                    console.log(`   Player ${this.currentPlayer.id} is peaceful`);

                    resolve({
                        destroyedPlayer: undefined
                    });
                }
            });
        });
    }

    async drawCardsPhase() {
        console.log("   Player asked to choose card type");

        return await new Promise(resolve => {
            this.getSocket(this.currentPlayer).emit('chooseCardType', (cardType: string) => {
                console.log(`   Player choose ${cardType} card`);

                if (cardType === 'event') {
                    let event = this.gameData.popEventCard();

                    this.showCardToPlayer(event, this.currentPlayer);

                    console.log(`   Player get event card: ${event.description}. Start performing`);

                    performEvent(event, this);

                    console.log(`   Event performed`);
                } else if (cardType === 'module') {
                    let module = this.gameData.popModuleCards(1)[0];

                    console.log(`   Player get module: ${module.name}`);

                    this.showCardToPlayer(module, this.currentPlayer);

                    this.currentPlayer.hand.push(module);

                    this.changePlayerData(this.currentPlayer);
                }

                this.setPlayersData();

                resolve(true);
            });
        });
    }

    async discardExtraCardsPhase() {
        console.log("   Player asked to discard cards");

        return await new Promise(resolve => {
            this.getSocket(this.currentPlayer).emit('discardCards', (discardedCardsIndexes: number[]) => {
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

                resolve(true);
            });
        });
    }

    showCardToPlayer(card: Module | Event, player: Player) {
        this.getSocket(player).emit('showCard', card);
    }

    getPlayerByOffsetFromCurrent(offset: number): Player {
        let currentPlayerId = Object.keys(this.players).indexOf(this.currentPlayer.id);

        do {
            currentPlayerId += Math.sign(offset);

            if (!this.getPlayerByIndex(currentPlayerId).isLose())
                offset += -Math.sign(offset);

            if (currentPlayerId === Object.keys(this.players).length || currentPlayerId === -1)
                currentPlayerId = 0;
        } while (offset !== 0);

        return this.getPlayerByIndex(currentPlayerId);
    }
}