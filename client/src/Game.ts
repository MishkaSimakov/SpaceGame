import {GameSettings} from "@common/GameSettings";
import {GameForPlayerDTO, OtherPlayer} from "@common/GameForPlayerDTO";
import {Message} from "@common/Types";
import {PlayerGetters} from "@common/getters/Player";

import Spaceships from "./graphics/scenes/Spaceships";
import Controls from "./graphics/scenes/Controls";
import Player, {PlayerId} from "../../common/Player";
import SocketManager from "./sockets/SocketManager";
import PopupsScene from "./graphics/scenes/Popups";

import {Stage} from "konva/lib/Stage";

export default class Game {
    currentTurnPlayerId: PlayerId;

    currentPlayer: Player;
    otherPlayers: OtherPlayer[];
    onlineMap: Record<PlayerId, boolean> = {};

    socketManager: SocketManager;

    spaceshipsScene: Spaceships;
    controlsScene: Controls;
    popupsScene: PopupsScene;

    settings: GameSettings;

    playerTime: Record<number, number> = {};
    timeDecreasingPlayerId: number;

    messages: Message[] = [];

    isFirstDraw: boolean = true;

    constructor() {
        const stage = new Stage({
            container: 'app',
            width: window.innerWidth,
            height: window.innerHeight
        });

        this.spaceshipsScene = new Spaceships(this);
        this.controlsScene = new Controls(this);
        this.popupsScene = new PopupsScene();

        stage.add(this.spaceshipsScene);
        stage.add(this.controlsScene);
        stage.add(this.popupsScene);

        this.spaceshipsScene.registerEvents();

        this.socketManager = new SocketManager(this);

        let prevTime = (new Date()).getTime();
        setInterval(() => {
            if (!this.settings || !this.settings.timeControlSettings || !this.timeDecreasingPlayerId) {
                return;
            }

            const currTime = (new Date()).getTime();
            this.playerTime[this.timeDecreasingPlayerId] -= (currTime - prevTime);
            prevTime = currTime;

            this.controlsScene.topBarDrawer.updateTime(this.playerTime);
        }, 1000);

        window.addEventListener('resize', () => {
            // game data is not loaded yet
            if (!this.settings) return;

            const newSize = {
                width: window.innerWidth,
                height: window.innerHeight
            };

            this.spaceshipsScene.setSize(newSize);
            this.controlsScene.setSize(newSize);
            this.popupsScene.setSize(newSize);

            this.controlsScene.activitiesQueue[0]?.activity.update();
            this.popupsScene.updatePositions();

            this.redraw([]);
        });
    }

    setGameData(gameDTO: GameForPlayerDTO) {
        this.currentTurnPlayerId = gameDTO.currentTurnPlayerId;
        this.onlineMap = gameDTO.onlineMap;
        this.otherPlayers = gameDTO.otherPlayers;
        this.settings = gameDTO.settings;

        if (!this.spaceshipsScene.isRebuildingSpaceship) {
            this.currentPlayer = gameDTO.player;
        }

        // time control
        if (this.settings?.withTimeControl) {
            this.timeDecreasingPlayerId = gameDTO.timeControl.timeDecreasingPlayerId;

            for (let player of this.getAllPlayers()) {
                if (this.timeDecreasingPlayerId === player.id && this.playerTime[this.timeDecreasingPlayerId])
                    continue;

                this.playerTime[player.id] = gameDTO.timeControl.playersTime[player.id];
            }
        }

        const newMessages = gameDTO.messages.slice(this.messages.length);
        this.messages = gameDTO.messages;

        this.updatePageTitle();
        this.redraw(newMessages);
    }

    redraw(newMessages: Message[]) {
        this.controlsScene.updateData(newMessages);
        this.spaceshipsScene.updateData(this.getAllPlayers());

        if (this.isFirstDraw) {
            this.isFirstDraw = false;
            this.spaceshipsScene.panToPlayerWithId(this.currentPlayer.id, 0);
        }

        if (this.spaceshipsScene.isRebuildingSpaceship) {
            this.spaceshipsScene.setIsRebuildSpaceshipAllowed(true);
        }
    }

    getCurrentPlayer(): Player | undefined {
        return this.currentPlayer;
    }

    getAllPlayers(): OtherPlayer[] {
        let allPlayers: OtherPlayer[] = [];

        allPlayers.push(...this.otherPlayers);
        allPlayers.push(PlayerGetters.forOtherPlayer(this.currentPlayer));

        return allPlayers;
    }

    getPlayerById(id: number): OtherPlayer {
        if (id === this.currentPlayer.id)
            return PlayerGetters.forOtherPlayer(this.currentPlayer);

        for (let player of this.otherPlayers) {
            if (player.id === id)
                return player;
        }
    }

    updatePageTitle() {
        if (this.currentTurnPlayerId === this.currentPlayer.id) {
            document.title = 'Ваш ход - Космические баталии';
        } else {
            document.title = 'Космические баталии';
        }
    }
}
