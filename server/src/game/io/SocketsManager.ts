import {Server, Socket} from "socket.io";

import {PlayerId} from "@common/Player";

export type SocketPlayerInfo = {
    online: boolean;
    socketId?: string;
};

export default class SocketsManager {
    io: Server;

    currentEmitPlayerId?: PlayerId;
    currentEmitFunction?: () => void;

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

    getSocket(socketId: string): Socket | undefined;
    getSocket(playerId: PlayerId): Socket | undefined;
    getSocket(value: PlayerId | string): Socket | undefined {
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

    async emitAndWait(playerId: PlayerId, event: string, withAcknowledgment: boolean, ...args: any[]) {
        return new Promise(resolve => {
            // generate function that must be called when player connected
            const emitFunction = () => {
                const socket = this.getSocket(playerId);

                if (withAcknowledgment) {
                    const acknowledgment = async (result: any) => {
                        this.currentEmitFunction = undefined;
                        this.currentEmitPlayerId = undefined;

                        resolve(result);
                    };

                    socket?.emit(event, ...args, acknowledgment);
                } else {
                    this.currentEmitFunction = undefined;
                    this.currentEmitPlayerId = undefined;

                    socket?.emit(event, ...args);

                    resolve(undefined);
                }
            };

            this.currentEmitFunction = emitFunction;
            this.currentEmitPlayerId = playerId;

            if (this.isPlayerConnected(playerId)) {
                emitFunction();
            }
        });
    }

    tryToEmitEvent(playerId: PlayerId) {
        if (this.currentEmitPlayerId !== playerId) {
            return;
        }

        if (this.isPlayerConnected(this.currentEmitPlayerId) && this.currentEmitFunction) {
            this.currentEmitFunction();
        }
    }

    private isPlayerConnected(playerId: PlayerId): boolean {
        const socket = this.getSocket(playerId);
        return socket !== undefined && socket.connected;
    }

    disconnectEveryone() {
        for (let player_id of Object.keys(this.players)) {
            this.getSocket(player_id)?.disconnect(true);
        }
    }
}