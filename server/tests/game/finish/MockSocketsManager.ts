import {ISocketsManager} from "@src/game/interfaces/ISocketsManager";
import {PlayerId} from "@common/Types";
import {EmitSettings} from "@src/game/io/SocketsManager";
import {deferred} from "@src/helpers/Deferred";


// Models a game, where all users are disconnected
export class MockSocketsManager implements ISocketsManager {
    disconnectEveryone(): void {
    }

    emit(playerId: PlayerId, settings: EmitSettings, event: string, ...args: any[]): Promise<any> {
        const def = deferred<any>();

        if (!settings.withAcknowledgement) {
            def.resolve(undefined);
        }

        return def.promise;
    }

    isOnline(playerId: PlayerId): boolean {
        return false;
    }

    onPlayerConnect(playerId: PlayerId, socketId: string): void {
    }

    onPlayerDisconnect(playerId: PlayerId): void {
    }

    tryToEmitEvent(playerId: PlayerId): void {
    }
}