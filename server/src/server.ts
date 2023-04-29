import {Server, Socket} from "socket.io";
import Player from "../../common/Player";
import Game from "./Game";

const server = require('express')();
const http = require('http').createServer(server);
const cors = require('cors');
const path = require('path');
import * as serveStatic from "serve-static";

const io: Server = require("socket.io")(http, {
    cors: {
        origin: "http://localhost:10001",
        methods: ["GET", "POST"]
    }
});

server.use(cors());
server.use(serveStatic(path.join(__dirname, '../../client/dist')))

server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

server.get('/game/:link', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

server.get('/check/:link', (req, res) => {
    res.send(
        game.getLinks().indexOf(parseInt(req.params.link)) !== -1
    );
});


let game: Game = new Game(2, io);
game.start().then(() => {
    for (let player of game.players)
        game.getSocket(player).disconnect();
});

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

        game.updatePlayersStatus();
    });

    io.sockets.sockets.get(socket.id).emit('getLink', async (link: number) => {
        if (game.getLinks().indexOf(link) === -1) {
            console.log("Connected user doesn't exist in this game");

            socket.disconnect();

            return;
        }

        player = game.playerConnected(link, socket.id);

        game.getSocketByLink(link).emit('setPlayersData', game.players);

        game.tryToEmitEvent();
    });
});

http.listen(3000, function () {
    console.log('Server started!');
});