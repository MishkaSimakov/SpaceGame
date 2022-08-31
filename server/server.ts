import {Server, Socket} from "socket.io";
import Player from "../common/Player";
import Spaceship from "../common/Spaceship";
import {plainToClass} from "../common/PlainToClass";
import Game from "./Game";
import {TurnPhase} from "../common/TurnPhase";
import Module from "../common/modules/Module";
import FightManager from "./FightManager";

const server = require('express')();
const http = require('http').createServer(server);
const cors = require('cors');
const path = require('path');
const serveStatic = require('serve-static');

const io: Server = require("socket.io")(http, {
    cors: {
        origin: "http://localhost:10001",
        methods: ["GET", "POST"]
    }
});

server.use(cors());
server.use(serveStatic(__dirname + "/client/dist"));

function setRebuildSpaceshipData(player: Player) {
    if (game.currentPlayer.id !== player.id) {
        throw new Error("Wrong player has rebuilt spaceship");
    }

    if (game.turnPhase !== TurnPhase.RebuildSpaceship) {
        throw new Error(`Player has rebuilt his spaceship in wrong turn phase (expected: ${TurnPhase.RebuildSpaceship}, got: ${game.turnPhase})`);
    }

    if (!player.canBeTurnedInto(player)) {
        throw new Error("Changed player has wrong cards or energy count");
    }

    if (!Spaceship.checkConfiguration(player.spaceship)) {
        throw new Error("Changed player has wrong spaceship configuration");
    }

    game.changePlayerData(player.id, player);
}

function askForFight(player: Player) {
    console.log(`Player ${player.id} had been asked for attack`);

    game.getSocket(player).emit('willYouFight', (response: { attackedPlayerId?: string }) => {
        if (response.attackedPlayerId !== undefined) {
            console.log(`Player ${player.id} has attacked player ${response.attackedPlayerId}`);

            let fightManager = new FightManager(player, game.players[response.attackedPlayerId], (destroyedPlayer) => {
                if (destroyedPlayer !== undefined) {
                    game.setDestroyed(destroyedPlayer);

                    if (Object.entries(game.players).filter(([key, player]) => !player.isLose()).length === 1) {
                        game.end();

                        return;
                    }
                }

                turn(game.getNextTurnPlayer());
            }, game);

            fightManager.makeFightIteration();
        } else {
            console.log(`Player ${player.id} is peaceful`);

            turn(game.getNextTurnPlayer());
        }
    });
}

function turn(player: Player) {
    game.currentPlayer = player;

    game.getSocket(player).emit('startTurn', player, (changedPlayer: Player) => {
        setRebuildSpaceshipData(plainToClass(changedPlayer, Player.getPropertiesMap()));

        game.setPlayersData();

        if (game.currentPlayer.spaceship.canAttack()) {
            askForFight(game.currentPlayer);

            return;
        }

        turn(game.getNextTurnPlayer());
    });
}

let game: Game = new Game(2, io);

io.on('connection', function (socket: Socket) {
    let player = game.addPlayer(socket.id);

    if (game.isFull()) {
        game.setPlayersData();

        game.start();

        turn(game.currentPlayer)
    }

    socket.on('disconnect', function () {

    });
});

http.listen(3000, function () {
    console.log('Server started!');
});