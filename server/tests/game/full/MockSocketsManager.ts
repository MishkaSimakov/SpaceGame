import {ISocketsManager} from "@src/game/interfaces/ISocketsManager";
import {PlayerId} from "@common/Types";
import {EmitSettings} from "@src/game/io/SocketsManager";
import {deferred} from "@src/helpers/Deferred";

type EmitListener = (player: PlayerId, settings: EmitSettings, event: string, ...args: any[]) => void;

// Models a game, where all users are disconnected
export class MockSocketsManager implements ISocketsManager {
    private emitListeners: EmitListener[] = [];

    addEmitListener(listener: EmitListener) {
        this.emitListeners.push(listener);
    }

    // ISocketsManager methods
    disconnectEveryone(): void {
    }

    emit(playerId: PlayerId, settings: EmitSettings, event: string, ...args: any[]): Promise<any> {
        for (const listener of this.emitListeners) {
            listener(playerId, settings, event, ...args);
        }

        const def = deferred<any>();

        if (!settings.withAcknowledgement) {
            def.resolve(undefined);
        }

        return def.promise;
    }

    isOnline(playerId: PlayerId): boolean {
        return false;
    }

    on(type: string, callback: (payload: any) => void): void {
    }

    onPlayerConnect(playerId: PlayerId, socketId: string): void {
    }

    onPlayerDisconnect(playerId: PlayerId): void {
    }

    tryToEmitEvent(playerId: PlayerId): void {
    }
}