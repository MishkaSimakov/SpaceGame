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
    io: Server;

    currentEmitPlayerId?: PlayerId;
    currentEmitFunction?: (socket: Socket) => void;

    players: Record<PlayerId, SocketPlayerInfo> = {};

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
        const socketId = (typeof value === 'string') ? value : this.players[value].socketId;

        return socketId ? this.io.sockets.sockets.get(socketId) : undefined;
    }

    isOnline(playerId: PlayerId): boolean {
        return this.players[playerId] && this.players[playerId].online;
    }

    onPlayerConnect(playerId: PlayerId, socketId: string) {
        if (!(playerId in this.players)) {
            console.log(this.players, playerId);
            throw new Error("Unknown player id connected to the game");
        }

        this.players[playerId].online = true;
        this.players[playerId].socketId = socketId;
    }

    onPlayerDisconnect(playerId: PlayerId) {
        if (!(playerId in this.players)) {
            console.log(this.players, playerId);
            throw new Error("Unknown player id disconnected from the game");
        }

        this.players[playerId].online = false;
        this.players[playerId].socketId = undefined;
    }

    async emit(playerId: PlayerId, settings: EmitSettings, event: string, ...args: any[]) {
        return new Promise<any>(resolve => {
            // generate function that must be called when player connected
            const emitFunction = (socket: Socket) => {
                if (settings.withAcknowledgement) {
                    const acknowledgment = async (result: any) => {
                        this.currentEmitFunction = undefined;
                        this.currentEmitPlayerId = undefined;

                        resolve(result);
                    };

                    socket.emit(event, ...args, acknowledgment);
                } else {
                    this.currentEmitFunction = undefined;
                    this.currentEmitPlayerId = undefined;

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
        for (let player_id of Object.keys(this.players)) {
            this.getSocket(player_id)?.disconnect(true);
        }
    }
}