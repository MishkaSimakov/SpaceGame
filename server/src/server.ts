import {Server, Socket} from "socket.io";
import Player from "../../common/Player";
import Game from "./Game";

const server = require('express')();
const http = require('http').createServer(server);
const cors = require('cors');
const path = require('path');
import * as serveStatic from "serve-static";
import GamesManager from "./GamesManager";

const io: Server = new Server(http, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

let gamesManager = new GamesManager(io);

server.use(cors());
server.use(serveStatic(path.join(__dirname, '../../client/dist')))

server.get('/spaceships/lobby', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/spaceships/html/index.html'));
});

server.get('/spaceships/game/create', (req, res) => {
    let playersCount: number = req.query.count;

    let createdGame = gamesManager.createGame(playersCount);

    res.send(JSON.stringify(createdGame.getLinks()));
});

server.get('/spaceships/game/:link', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/spaceships/html/game.html'));
});

server.get('/spaceships/check/:link', (req, res) => {
    res.send(gamesManager.checkPlayerLinkExist(parseInt(req.params.link)));
});


let game: Game = gamesManager.createGame(2);
console.log(game.getLinks().join(', '));

io.on('connection', async function (socket: Socket) {
    console.log("User connected");

    let player: Player;

    socket.on('disconnect', function () {
        if (player === undefined) {
            console.log("disconnected");
            return;
        }

        console.log(`disconnected user with link: ${player.link}`)
        player.socketId = undefined;
        player.online = false;

        gamesManager.getGameByLink(player.link).updatePlayersStatus();
    });

    io.sockets.sockets.get(socket.id).emit('getLink', async (link: number) => {
        let game = gamesManager.getGameByLink(link)

        if (!game) {
            console.log("Connected user doesn't exist in this game");

            socket.disconnect();

            return;
        }

        player = game.playerConnected(link, socket.id);
        game.getSocketByLink(link).emit('setPlayersData', game.players);
        game.getSocketByLink(link).emit('setGameSettings', {
            withTimeControl: game.withTimeControl
        });
        game.tryToEmitEvent();
    });
});

http.listen(3000, function () {
    console.log('Server started!');
});