import io, {Socket} from "socket.io-client";
import Player from "../../../common/Player";
import EventCardsEventListener from "./listeners/EventCardsEventListener";
import FightEventListener from "./listeners/FightEventListener";
import InfoEventListener from "./listeners/InfoEventListener";
import Game from "../Game";
import MainGameEventListener from "./listeners/MainGameEventListener";
import {Event} from "../../../common/events/Event";
import {HAS_PLAYERS_DATA} from "../../../common/Sockets";

export default class SocketManager {
    game: Game;

    socket: Socket;
    listeners: any[] = [MainGameEventListener, EventCardsEventListener, FightEventListener, InfoEventListener];

    constructor(game: Game) {
        this.game = game;

        this.initSocket('http://localhost:3000');

        // register socket listeners
        for (let listener of this.listeners) {
            new listener(this, this.game);
        }
    }

    on(ev: string, listener: (...args) => any) {
        let newListener = (...args) => {
            if (args[0] === HAS_PLAYERS_DATA) {
                this.game.setPlayersData(args[1]);

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
        });

        this.on('disconnect', () => {
            // window.location.href = '/spaceships/lobby';
        })

        this.on('getLink', (callback: (link: number) => void) => {
            callback(this.game.link);
        });

        this.on('setPlayersData', (players: Player[]) => {
            this.game.setPlayersData(players);
        });

        this.on('setPlayersStatus', (players: { link: number, online: boolean }[]) => {
            for (let player of players) {
                if (this.game.getPlayerByLink(player.link)) {
                    this.game.getPlayerByLink(player.link).online = player.online;
                }
            }

            // this.game.controlsScene.topBarDrawer.drawPlayersList(this.game.players, this.game.link, (link) => {
            //     this.game.spaceshipsScene.panToPlayerWithLink(link);
            // });
        });

        this.on('setGameSettings', (gameSettings) => {
            this.game.withTimeControl = gameSettings.withTimeControl;
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