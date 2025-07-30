import io, {Socket} from "socket.io-client";

import {Event} from "@common/events/Event";
import {HAS_PLAYERS_DATA} from "@common/Sockets";
import {GameForPlayerDTO} from "@common/GameForPlayerDTO";
import {Action} from "@common/actions/Action";

import Game from "../Game";
import {ListenersContainer} from "./listeners/ListenersContainer";

import {mainListeners} from "./listeners/MainListeners";
import {infoListeners} from "./listeners/InfoListeners";
import {eventCardsListeners} from "./listeners/EventCardsListeners";
import {fightListeners} from "./listeners/FightListeners";

const listeners: ListenersContainer = {
    ...mainListeners,
    ...infoListeners,
    ...eventCardsListeners,
    ...fightListeners
};

export default class SocketManager {
    game: Game;

    socket: Socket;

    constructor(game: Game) {
        this.game = game;

        this.initSocket(window.location.origin);

        // register socket listeners
        for (const actionType of Object.keys(listeners)) {
            this.socket.on(actionType, (payload, callback) => {
                listeners[actionType](payload, {
                    game: this.game,
                    socket: this.socket
                }).then((action: Action) => {
                    callback(action);
                });
            });
        }

        this.socket.onAny((...args) => {
            console.log("⚡", ...args);
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

            this.socket.emit('gameId', window.location.href.split('/').pop());
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
}
