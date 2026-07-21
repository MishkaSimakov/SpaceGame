import {ISocketsManager} from "@src/game/interfaces/ISocketsManager";
import {PlayerId} from "@common/Types";
import {EmitSettings} from "@src/game/io/SocketsManager";
import {deferred} from "@common/helpers/Deferred";

type EmitListener = (player: PlayerId, settings: EmitSettings, event: string, ...args: any[]) => void;
type SocketListener = (player: PlayerId, payload: any) => void;

// Models a game, where all users are disconnected
export class MockSocketsManager implements ISocketsManager {
    private emitListeners: EmitListener[] = [];
    private socketListeners = new Map<string, SocketListener[]>();

    // An emit listener that throws models a transport that fails synchronously, so `emit(...).catch(...)`
    // never gets to attach a handler.
    addEmitListener(listener: EmitListener) {
        this.emitListeners.push(listener);
    }

    // Delivers a client message to the listeners the game registered through `on`.
    trigger(type: string, player: PlayerId, payload: any) {
        for (const listener of this.socketListeners.get(type) ?? []) {
            listener(player, payload);
        }
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

    isOnline(): boolean {
        return false;
    }

    on(type: string, callback: SocketListener): void {
        const existing = this.socketListeners.get(type);

        if (existing) {
            existing.push(callback);
        } else {
            this.socketListeners.set(type, [callback]);
        }
    }

    onPlayerConnect(): void {
    }

    onPlayerDisconnect(): void {
    }

    tryToEmitEvent(): void {
    }
}