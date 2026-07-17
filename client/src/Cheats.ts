import {mainModulesInfo, modulesInfo} from "@common/cards/Modules";
import {eventsInfo} from "@common/cards/Events";
import {
    cheatChangeEnergy,
    cheatPushEventCardToHand, cheatPushEventCardToStack,
    cheatPushModuleCardToHand,
    cheatPushModuleCardToStack, cheatSetMainModuleType
} from "@common/Actions";

import SocketManager from "./sockets/SocketManager";
import Game from "./Game";
import {EventType, MainModuleType, ModuleConnectors, ModuleType, PlayerId} from "@common/Types";

// Cheats is driven by hand from the browser console, where TypeScript's types are gone and Chrome
// can only offer bare parameter names. These strings are the API documentation the console can
// actually show — `cheats.help()` — and the contract quoted back in a validator's error message.
// The declared parameter types are `any` because console input is untrusted; the signature states
// what an argument is *supposed* to be.
export const signatures = {
    changeEnergy: "changeEnergy(delta: number, playerId: PlayerId = thisPlayerId())",
    setMainModuleType: "setMainModuleType(type: MainModuleType, connectors: ModuleConnectors, playerId: PlayerId = thisPlayerId())",
    pushModuleCardToHand: "pushModuleCardToHand(type: ModuleType, connectors: ModuleConnectors, playerId: PlayerId = thisPlayerId())",
    pushModuleCardToStack: "pushModuleCardToStack(type: ModuleType, connectors: ModuleConnectors)",
    pushEventCardToHand: "pushEventCardToHand(type: EventType, playerId: PlayerId = thisPlayerId())",
    pushEventCardToStack: "pushEventCardToStack(type: EventType)",
};

export class Cheats {
    constructor(
        private readonly gameManager: Game,
        private readonly socketManager: SocketManager,
    ) {
    }

    help() {
        console.table(signatures);
    }

    changeEnergy(delta: any, playerId: any = this.thisPlayerId()) {
        this.socketManager.cheat(cheatChangeEnergy(
            this.validatePlayerId(1, playerId, signatures.changeEnergy),
            this.validateNumber(0, delta, signatures.changeEnergy)
        ));
    }

    setMainModuleType(type: MainModuleType, connectors: ModuleConnectors, playerId: PlayerId = this.thisPlayerId()) {
        this.socketManager.cheat(cheatSetMainModuleType(playerId, type, connectors));
    }

    // TODO: validate
    pushModuleCardToHand(type: ModuleType, connectors: ModuleConnectors, playerId: PlayerId = this.thisPlayerId()) {
        this.socketManager.cheat(cheatPushModuleCardToHand(playerId, type, connectors));
    }

    // TODO: validate
    pushModuleCardToStack(type: ModuleType, connectors: ModuleConnectors) {
        this.socketManager.cheat(cheatPushModuleCardToStack(type, connectors));
    }

    // TODO: validate
    pushEventCardToHand(type: EventType, playerId: PlayerId = this.thisPlayerId()) {
        this.socketManager.cheat(cheatPushEventCardToHand(playerId, type));
    }

    // TODO: validate
    pushEventCardToStack(type: EventType) {
        this.socketManager.cheat(cheatPushEventCardToStack(type));
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

    private validateNonNegativeNumber(argId: number, value: any, signature: string) {
        const parsed = Number(value);

        if (Number.isNaN(parsed) || parsed < 0) {
            throw new TypeError(`Argument #${argId} must be a valid non-negative number. Received ${value} instead.\nMethod signature: ${signature}`);
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