import io, {Socket} from "socket.io-client";

import {Event} from "@common/events/Event";
import {HAS_PLAYERS_DATA} from "@common/Sockets";
import {GameForPlayerDTO} from "@common/GameForPlayerDTO";
import {Action, isAction} from "@common/actions/Action";

import Game from "../Game";
import {ListenersContainer} from "./listeners/ListenersContainer";

import {mainListeners} from "./listeners/MainListeners";
import {infoListeners} from "./listeners/InfoListeners";
import {eventCardsListeners} from "./listeners/EventCardsListeners";
import {fightListeners} from "./listeners/FightListeners";
import {SocketInitPayload} from "@common/Types";
import Color from "../graphics/Color";
import {COLORS} from "../graphics/constants";

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
                }).then((action: Action<string, any, any>) => {
                    if (actionType.endsWith('Request')) {
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
            this.game.popupsScene.addPopup("Соединение с сервером потеряно", COLORS.BUTTON.DANGER.ACTIVE);
        });

        this.socket.on('connect', () => {
            if (this.wasDisconnected) {
                this.game.popupsScene.addPopup("Соединение с сервером восстановлено", COLORS.BUTTON.PRIMARY.ACTIVE);
            }
        });
    }

    on(ev: string, listener: (...args) => any) {
        let newListener = (...args) => {
            if (args[0] === HAS_PLAYERS_DATA) {
                this.game.setGameData(args[1]);

                args = args.slice(2);
            }

            listener(...args);
        };

        this.socket.on(ev, newListener);
    }

    initSocket(uri: string) {
        this.socket = io(uri);

        this.on('connect', () => {
            console.log('connected!');

            this.socket.emit('init', {
                gameId: window.location.href.split('/').pop(),
                token: document.cookie
                    .split("; ")
                    .find((row) => row.startsWith("authentication_token"))
                    ?.split("=")[1]
            } as SocketInitPayload);
        });

        this.on('disconnect', () => {
            // window.location.href = '/spaceships/lobby';
        });

        this.on('setGameData', (gameDTO: GameForPlayerDTO) => {
            this.game.setGameData(gameDTO);
        });
    }

    // return is event accepted
    useEventCard(event: Event): Promise<boolean> {
        return new Promise((resolve) => {
            this.socket.emit('useEventCard', event, (isAccepted: boolean) => {
                resolve(isAccepted);
            });
        });
    }

    private showErrors(errors: any) {
        if (!errors || !Array.isArray(errors)) {
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
}
