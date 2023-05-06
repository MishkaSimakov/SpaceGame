import io, {Socket} from "socket.io-client";
import Player from "../../../common/Player";
import EventCardsEventListener from "./listeners/EventCardsEventListener";
import FightEventListener from "./listeners/FightEventListener";
import InfoEventListener from "./listeners/InfoEventListener";
import Game from "../Game";
import MainGameEventListener from "./listeners/MainGameEventListener";
import {Event} from "../../../common/events/Event";

export default class SocketManager {
    game: Game;

    socket: Socket;
    listeners: any[] = [MainGameEventListener, EventCardsEventListener, FightEventListener, InfoEventListener];

    constructor(game: Game) {
        this.game = game;

        this.initSocket('http://localhost:3000');

        // register another socket listeners
        console.log("Register listeners");
        for (let listener of this.listeners) {
            console.log("Registering: ", listener.toString());

            new listener(this.socket, this.game);
        }
    }

    initSocket(uri: string) {
        this.socket = io(uri);

        this.socket.on('connect', () => {
            console.log('connected!');
        });

        this.socket.on('disconnect', () => {
            location.href = 'http://localhost:3000';
        })

        this.socket.on('getLink', (callback: (link: number) => void) => {
            callback(this.game.link);
        });

        this.socket.on('setPlayersData', (players: Player[]) => {
            this.game.setPlayersData(players);
        });

        this.socket.on('setPlayersStatus', (players: { link: number, online: boolean }[]) => {
            for (let player of players) {
                if (this.game.getPlayerByLink(player.link)) {
                    this.game.getPlayerByLink(player.link).online = player.online;
                }
            }

            // this.game.controlsScene.topBarDrawer.drawPlayersList(this.game.players, this.game.link, (link) => {
            //     this.game.spaceshipsScene.panToPlayerWithLink(link);
            // });
        });
    }

    // return is event accepted
    useEventCard(event: Event): Promise<boolean> {
        console.log("here");

        return new Promise((resolve) => {
            this.socket.emit('useEventCard', event, (isAccepted: boolean) => {
                resolve(isAccepted);
            });
        });
    }
}