import {mainModulesInfo, modulesInfo} from "@common/cards/Modules";
import {eventsInfo} from "@common/cards/Events";

import SocketManager from "./sockets/SocketManager";
import Game from "./Game";
import {cheatChangeEnergy} from "@common/Actions";

export class Cheats {
    constructor(
        private readonly gameManager: Game,
        private readonly socketManager: SocketManager,
    ) {
    }

    changeEnergy(delta: any, playerId: any = this.thisPlayerId()) {
        const signature = "changeEnergy(delta: number, playerId: PlayerId = this.thisPlayerId())";

        this.socketManager.cheat(cheatChangeEnergy(
            this.validatePlayerId(1, playerId, signature),
            this.validateNumber(0, delta, signature)
        ));
    }

    setMainModuleType(type: any) {
        // validate input
    }

    // getters
    getMainModules() {
        return mainModulesInfo;
    }

    getModules() {
        return modulesInfo;
    }

    getEvents() {
        return eventsInfo;
    }

    getPlayers() {
        return this.gameManager.getAllPlayers();
    }

    thisPlayerId() {
        return this.gameManager.currentPlayer.id;
    }

    // validators
    private validateNumber(argId: number, value: any, signature: string) {
        const parsed = Number(value);

        if (Number.isNaN(parsed)) {
            throw new TypeError(`Argument #${argId} must be a valid number. Received ${value} instead.\nMethod signature: ${signature}`);
        }

        return parsed;
    }

    private validatePlayerId(argId: number, value: any, signature: string) {
        const errorMessage = `Argument #${argId} must be a valid player id. Received ${value} instead.\nMethod signature: ${signature}`;
        const parsed = Number(value);

        if (Number.isNaN(parsed)) {
            throw new TypeError(errorMessage);
        }

        if (!this.gameManager.getAllPlayers().map(p => p.id).includes(parsed)) {
            throw new TypeError(errorMessage);
        }

        return parsed;
    }
}