import initRoutes from "./routes";

const express = require('express');
const http = require('http');

import {Server, Socket} from "socket.io";

import cors from "cors";
import path from "path";
import serveStatic from "serve-static";
import edge from "express-edge";
import cookieParser from 'cookie-parser';
import {Express} from "express";

export default class ServerManager {
    server: Express;
    httpServer;
    io: Server;

    staticBasePath: string;

    constructor() {}

    initServer() {
        this.staticBasePath = path.join(__dirname, '../../../client/dist');

        this.server = express();

        this.server.use(cookieParser());
        this.server.use(edge);
        this.server.set('views', `${__dirname}/../views`);
        this.server.use(cors());
        this.server.use(serveStatic(this.staticBasePath));
        this.server.use(express.urlencoded({extended: false}));

        initRoutes(this.server);

        this.server.get('*', (req, res) => {
            res.status(404).render('error', {
                code: 404
            });
        });
    }

    initSockets(): Server {
        this.httpServer = http.createServer(this.server);

        this.io = new Server(this.httpServer, {
            cors: {
                origin: "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });

        return this.io;
    }

    runServer() {
        this.httpServer.listen(3000, () => {
            console.log('Server started!');
        });
    }
}
