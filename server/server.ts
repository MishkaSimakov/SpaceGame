import {Server, Socket} from "socket.io";
import Player from "../common/Player";
import Spaceship from "../common/Spaceship";
import {plainToClass} from "../common/PlainToClass";
import Game from "./Game";
import {TurnPhase} from "../common/TurnPhase";
import Module from "../common/modules/Module";
import FightManager from "./FightManager";
import {Event, EventTypes} from "../common/events/Event";

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

async function turn(player: Player) {
    // set current turn player
    console.log(`Turn of player ${player.id}`);
    game.currentPlayer = player;

    // collect energy
    game.collectEnergyPhase();

    // rebuild spaceship
    await game.rebuildSpaceshipPhase();

    // fix spaceship
    if (game.currentPlayer.spaceship.hasRepairModule())
        await game.fixSpaceshipPhase();

    // ask for attack
    if (game.currentPlayer.spaceship.canAttack()) {
        let result = await game.attackPhase();

        if (result.destroyedPlayer !== undefined) {
            console.log(`   Player ${result.destroyedPlayer.id} was destroyed`);
            game.setDestroyed(result.destroyedPlayer);
        }

        if (Object.entries(game.players).filter(([key, player]) => !player.isLose()).length === 1) {
            game.end();

            return;
        }
    }

    // take cards
    await game.drawCardsPhase();

    // discard extra cards
    if (game.currentPlayer.hand.length > 5)
        await game.discardExtraCardsPhase();

    await turn(game.getNextTurnPlayer());
}

let game: Game = new Game(2, io);

io.on('connection', async function (socket: Socket) {
    let player = game.addPlayer(socket.id);

    socket.on('disconnect', function () {
        console.log("disconnected");
    });

    if (game.isFull()) {
        game.setPlayersData();

        game.start();

        await turn(game.currentPlayer)
    }
});

http.listen(3000, function () {
    console.log('Server started!');
});