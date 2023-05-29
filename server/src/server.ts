import {Server, Socket} from "socket.io";
import Player from "../../common/Player";
import Game from "./game/Game";

const server = require('express')();
const http = require('http').createServer(server);
const cors = require('cors');
const path = require('path');
import * as serveStatic from "serve-static";
import GamesManager from "./game/GamesManager";

const io: Server = new Server(http, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

let gamesManager = new GamesManager(io);

server.use(cors());
server.use(serveStatic(path.join(__dirname, '../../client/dist')))

server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/html/index.html'));
});

server.get('/create', (req, res) => {
    let playersCount: number = req.query.count;

    let createdGame = gamesManager.createGame(playersCount);

    res.send(JSON.stringify(createdGame.getLinks()));
});

server.get('/game/:link', (req, res) => {
    if (!gamesManager.checkPlayerLinkExist(parseInt(req.params.link))) {
        res.redirect("/");

        return;
    }

    res.sendFile(path.join(__dirname, '../../client/dist/html/game.html'));
});

server.get('/check/:link', (req, res) => {
    res.send(gamesManager.checkPlayerLinkExist(parseInt(req.params.link)));
});


let game: Game = gamesManager.createGame(2);
console.log(game.getLinks().join(', '));

http.listen(3000, function () {
    console.log('Server started!');
});