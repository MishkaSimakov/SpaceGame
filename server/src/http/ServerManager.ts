import initRoutes from "./routes";

import express from 'express';
import http, {Server as HTTPServer} from 'http';

import {Server as SocketServer} from "socket.io";

import cors from "cors";
import path from "path";
import serveStatic from "serve-static";

// @ts-expect-error edge.js is ESM-only and ships no CommonJS types for node16 resolution
import {Edge} from "edge.js";
import cookieParser from 'cookie-parser';
import {Express} from "express";
import session from "express-session";
import flash from "express-flash";

import * as process from "node:process";
import * as assert from "node:assert";

export default class ServerManager {
    server?: Express;
    httpServer?: HTTPServer;
    io?: SocketServer;

    edge?: Edge;

    staticBasePath: string;

    constructor() {
        this.staticBasePath = path.join(__dirname, '../../../client/dist');
    }

    initServer() {
        this.server = express();
        this.edge = Edge.create();
        this.edge.mount('default', `${__dirname}/../views`);

        assert.ok(process.env.SESSION_SECRET_KEY, "Secret key must be set in .env file");
        this.server.use(session({
            secret: process.env.SESSION_SECRET_KEY,
            resave: false,
            saveUninitialized: true
        }));
        this.server.use(flash());
        this.server.use(cookieParser());
        this.server.use((req, res, next) => {
            (res as any).view = this.edge!.createRenderer();

            next();
        });


        this.server.use(cors());
        this.server.use(serveStatic(this.staticBasePath));
        this.server.use(express.urlencoded({extended: false}));

        // error handler
        this.server.use((err: unknown, req: any, res: any, next: any) => {
            console.error(err);
            res.status(500).json({message: "Internal server error"});
        });

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
        this.httpServer!.listen(3000, () => {
            console.log('Server started!');
        });
    }
}
