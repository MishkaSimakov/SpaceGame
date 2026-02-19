import io, {Socket} from "socket.io-client";

import {Action} from "@common/ActionsHelpers";
import {SocketInitPayload} from "@common/SocketsTypes";

import Game from "../Game";
import {ListenersContainer} from "./listeners/ListenersContainer";
import {mainListeners} from "./listeners/MainListeners";
import {infoListeners} from "./listeners/InfoListeners";
import {eventCardsListeners} from "./listeners/EventCardsListeners";
import {fightListeners} from "./listeners/FightListeners";
import {COLORS} from "../graphics/constants";
import {ShowHugeMessageActivity} from "../graphics/activities/ShowHugeMessage";
import {GameForPlayerDTO} from "@common/Types";
import {playerRequestsPause, playerRequestsResume} from "@common/Actions";

const listeners: ListenersContainer = {
    ...mainListeners,
    ...infoListeners,
    ...eventCardsListeners,
    ...fightListeners
};

export default class SocketManager {
    game: Game;
    socket: Socket;

    wasDisconnected: boolean = false;

    constructor(game: Game) {
        this.game = game;

        this.initSocket(window.location.origin);

        // register socket listeners
        for (const actionType of Object.keys(listeners)) {
            this.socket.on(actionType, (payload, callback?) => {
                this.showErrors(payload.errors);

                listeners[actionType](payload, {
                    game: this.game,
                    socket: this.socket
                }).then((action?: Action<string, any, any>) => {
                    // type of this action is checked in compile-time via TypeScript
                    if (callback && action) {
                        callback(action);
                    }
                });
            });
        }

        this.socket.onAny((...args) => {
            console.log("⚡", ...args);
        });

        this.socket.on('disconnect', () => {
            this.wasDisconnected = true;
            this.game.popupsScene.addPopup("Соединение с сервером потеряно", COLORS.BUTTON.DANGER.ACTIVE, 5000);
        });

        this.socket.on('connect', () => {
            if (this.wasDisconnected) {
                this.game.popupsScene.addPopup("Соединение с сервером восстановлено", COLORS.BUTTON.PRIMARY.ACTIVE, 5000);
            }
        });
    }

    on(ev: string, listener: (...args) => any) {
        this.socket.on(ev, listener);
    }

    initSocket(uri: string) {
        this.socket = io(uri);

        this.on('connect', () => {
            this.socket.emit('init', {
                gameId: window.location.href.split('/').pop(),
                token: document.cookie
                    .split("; ")
                    .find((row) => row.startsWith("authentication_token"))
                    ?.split("=")[1]
            } as SocketInitPayload);
        });

        this.on('setGameData', (gameDTO: GameForPlayerDTO) => {
            this.game.setGameData(gameDTO);
        });

        this.on('errors', (errors: string[]) => {
            this.showErrors(errors);
        });

        this.on('gameFinished', async (reason: string) => {
            await this.game.controlsScene.enqueueActivity(
                new ShowHugeMessageActivity(this.game.controlsScene, `Игра окончена\n${reason}`)
            );

            this.exit();
        });
    }

    private showErrors(errors: any) {
        if (!errors) {
            return;
        }

        if (!Array.isArray(errors)) {
            console.error("Wrong value received in errors:", errors);
            return;
        }

        errors.forEach(error => {
            this.game.popupsScene.addPopup(
                `Ошибка: ${error}. Если вы не пытались ничего сломать, напишите об ошибке Мише.`,
                COLORS.BUTTON.DANGER.ACTIVE,
                5000
            );
        })
    }

    private exit() {
        window.location.href = window.location.origin;
    }

    private emitAction(action: Action) {
        this.socket.emit(action.type, action.payload);
    }

    cheat(action: Action<any, any>) {
        if (!action.type.startsWith("cheat")) {
            throw new TypeError("cheat method must be used only for cheating!");
        }

        this.emitAction(action);
    }

    pause() {
        this.emitAction(playerRequestsPause());
    }

    resume() {
        this.emitAction(playerRequestsResume());
    }
}
