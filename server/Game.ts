import Player from "../common/Player";
import GameData from "./GameData";
import Spaceship from "../common/Spaceship";
import SpaceSolver from "../common/modules/SpaceSolver";
import {TurnPhase} from "../common/TurnPhase";
import {Server, Socket} from "socket.io";

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

    changePlayerData(id: string, player: Player): boolean {
        if (this.players[id] === undefined)
            return false;

        this.players[id] = player;

        if (this.currentPlayer.id === id)
            this.currentPlayer = this.players[id];

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

        this.changePlayerData(destroyedPlayerData.id, destroyedPlayerData);

        console.log(`Player ${destroyedPlayerData.id} lose`);
    }

    end() {
        let winner = Object.entries(this.players).filter(([key, player]) => !player.isLose())[0][1];

        console.log(`Game end. Player ${winner.id} has won`);
    }
}