import {PlayerId} from "@common/Types";

import {EmitSettings} from "@src/game/io/SocketsManager";

export interface ISocketsManager {
    isOnline(playerId: PlayerId): boolean;

    onPlayerConnect(playerId: PlayerId, socketId: string): void;

    onPlayerDisconnect(playerId: PlayerId): void;

    emit(playerId: PlayerId, settings: EmitSettings, event: string, ...args: any[]): Promise<any>;

    tryToEmitEvent(playerId: PlayerId): void;

    disconnectEveryone(): void;
}