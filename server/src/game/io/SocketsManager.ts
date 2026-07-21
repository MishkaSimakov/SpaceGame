import {Server, Socket} from "socket.io";

import {PlayerId} from "@common/Types";

import {ISocketsManager} from "@src/game/interfaces/ISocketsManager";

type SocketPlayerInfo = {
    online: boolean;
    socketId?: string;
};

export type EmitSettings = {
    // if true, `emit` resolves only after acknowledgement from a recipient is received
    withAcknowledgement: boolean,

    // if true, message will be queued and sent only when user is connected
    // if false and user is not connected, message will be discarded
    ensureSending: boolean
};

export default class SocketsManager implements ISocketsManager {
    private io: Server;

    private currentEmitPlayerId?: PlayerId;
    private currentEmitFunction?: (socket: Socket) => void;

    private players: Record<PlayerId, SocketPlayerInfo> = {};

    private listeners: { type: string, callback: (player: PlayerId, payload: any) => void }[] = [];

    constructor(io: Server, players: PlayerId[]) {
        this.io = io;

        for (const playerId of players) {
            this.players[playerId] = {
                online: false,
                socketId: undefined
            };
        }
    }

    private getSocket(socketId: string): Socket | undefined;
    private getSocket(playerId: PlayerId): Socket | undefined;
    private getSocket(value: PlayerId | string): Socket | undefined {
        const socketId = (typeof value === 'string') ? value : this.players[value]?.socketId;

        return socketId ? this.io.sockets.sockets.get(socketId) : undefined;
    }

    isOnline(playerId: PlayerId): boolean {
        return this.players[playerId] !== undefined && this.players[playerId].online;
    }

    onPlayerConnect(playerId: PlayerId, socketId: string) {
        const player = this.players[playerId];
        if (!player) {
            throw new Error("Unknown player id connected to the game");
        }

        player.online = true;
        player.socketId = socketId;

        this.listeners.forEach(({type, callback}) =>
            this.getSocket(playerId)?.on(type, (payload: any) => callback(playerId, payload)));
    }

    onPlayerDisconnect(playerId: PlayerId) {
        const player = this.players[playerId];
        if (!player) {
            throw new Error("Unknown player id disconnected from the game");
        }

        player.online = false;
        player.socketId = undefined;
    }

    async emit(playerId: PlayerId, settings: EmitSettings, event: string, ...args: any[]) {
        return new Promise<any>(resolve => {
            // generate function that must be called when player connected
            const emitFunction = (socket: Socket) => {
                if (settings.withAcknowledgement) {
                    const acknowledgment = (result: any) => {
                        if (settings.ensureSending) {
                            this.currentEmitFunction = undefined;
                            this.currentEmitPlayerId = undefined;
                        }

                        resolve(result);
                    };

                    socket.emit(event, ...args, acknowledgment);
                } else {
                    if (settings.ensureSending) {
                        this.currentEmitFunction = undefined;
                        this.currentEmitPlayerId = undefined;
                    }

                    console.log(`emitting ${event}`);
                    socket.emit(event, ...args);

                    resolve(undefined);
                }
            };

            if (settings.ensureSending) {
                this.currentEmitFunction = emitFunction;
                this.currentEmitPlayerId = playerId;
            }

            const socket = this.getSocket(playerId);
            if (socket && socket.connected) {
                emitFunction(socket);
            } else if (!settings.ensureSending) {
                resolve(undefined);
            }
        });
    }

    tryToEmitEvent(playerId: PlayerId) {
        if (this.currentEmitPlayerId !== playerId) {
            return;
        }

        const socket = this.getSocket(playerId);
        if (this.currentEmitFunction && socket && socket.connected) {
            this.currentEmitFunction(socket);
        }
    }

    disconnectEveryone() {
        for (const playerId of Object.keys(this.players)) {
            this.getSocket(playerId)?.disconnect(true);
        }
    }

    on(type: string, callback: (player: PlayerId, payload: any) => void) {
        this.listeners.push({type, callback});
    }
}