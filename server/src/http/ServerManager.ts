import initRoutes from "./routes";

import express from 'express';
import http, {Server as HTTPServer} from 'http';

import {Server as SocketServer, Socket} from "socket.io";

import cors from "cors";
import path from "path";
import serveStatic from "serve-static";
import edge from "express-edge";
import cookieParser from 'cookie-parser';
import {Express} from "express";

export default class ServerManager {
    server: Express;
    httpServer: HTTPServer;
    io: SocketServer;

    staticBasePath: string;

    constructor() {
    }

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

    initSockets(): SocketServer {
        this.httpServer = http.createServer(this.server);

        this.io = new SocketServer(this.httpServer, {
            cors: {
                origin: "http://127.0.0.1:3000",
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
