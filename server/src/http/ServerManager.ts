import initRoutes from "./routes";
import {render} from "@src/helpers/Render";

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
            assert.ok(this.edge);
            (res as any).view = this.edge.createRenderer();

            next();
        });


        this.server.use(cors());
        this.server.use(serveStatic(this.staticBasePath));
        this.server.use(express.urlencoded({extended: false}));

        initRoutes(this.server);

        this.server.use((req, res) => {
            res.status(404);
            render(res, 'error', {code: 404});
        });

        // Express only treats a middleware as an error handler if it declares all four parameters,
        // so the unused ones have to stay in the signature.
        this.server.use((err: unknown, _req: any, res: any, _next: any) => {
            console.error(err);

            res.status(500);
            render(res, 'error', {code: 500});
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
        assert.ok(this.httpServer);
        this.httpServer.listen(3000, () => {
            console.log('Server started!');
        });
    }
}
