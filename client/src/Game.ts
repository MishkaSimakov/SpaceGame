import {GameForPlayerDTO, GameSettings, Message, OtherPlayer, Player, PlayerId} from "@common/Types";
import {PlayerGetters} from "@common/getters/Player";

import Spaceships from "./graphics/scenes/Spaceships";
import Controls from "./graphics/scenes/Controls";
import RebuildSpaceshipManager from "./graphics/RebuildSpaceshipManager";
import SocketManager from "./sockets/SocketManager";
import {Graphics} from "./graphics/engine/Graphics";
import {DD} from "./graphics/engine/Drag";
import PopupsScene from "./graphics/scenes/Popups";

export default class Game {
    currentTurnPlayerId: PlayerId;

    currentPlayer: Player;
    otherPlayers: OtherPlayer[];
    onlineMap: GameForPlayerDTO["onlineMap"] = [];

    socketManager: SocketManager;

    spaceshipsScene: Spaceships;
    controlsScene: Controls;
    popupsScene: PopupsScene;

    rebuildSpaceshipManager: RebuildSpaceshipManager;

    settings: GameSettings;

    playerTime: Record<PlayerId, number> = {};
    timeDecreasingPlayerId: number;

    messages: Message[] = [];

    isFirstDraw: boolean = true;

    constructor() {
        const graphics = new Graphics({
            container: 'app',
            width: window.innerWidth,
            height: window.innerHeight
        });

        window["graphics"] = graphics;
        window["drag"] = DD;
        window["errors"] = [];

        this.spaceshipsScene = new Spaceships(this);
        this.controlsScene = new Controls(this);
        this.popupsScene = new PopupsScene(this);

        graphics.add(this.spaceshipsScene);
        graphics.add(this.controlsScene);
        graphics.add(this.popupsScene);

        this.rebuildSpaceshipManager = new RebuildSpaceshipManager(this);

        this.socketManager = new SocketManager(this);

        let prevTime = (new Date()).getTime();
        setInterval(() => {
            if (!this.settings || !this.settings.timeControlSettings || !this.timeDecreasingPlayerId) {
                return;
            }

            const currTime = (new Date()).getTime();
            if (this.timeDecreasingPlayerId in this.playerTime) {
                this.playerTime[this.timeDecreasingPlayerId] -= (currTime - prevTime);
            }
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
            this.popupsScene.update();

            this.redraw([]);
        });
    }

    setGameData(gameDTO: GameForPlayerDTO) {
        this.currentTurnPlayerId = gameDTO.currentTurnPlayerId;
        this.onlineMap = gameDTO.onlineMap;
        this.otherPlayers = gameDTO.otherPlayers;
        this.settings = gameDTO.settings;

        if (!this.rebuildSpaceshipManager.isRebuildingSpaceship) {
            this.currentPlayer = gameDTO.player;
        }

        // time control
        if (this.settings.timeControlSettings) {
            this.timeDecreasingPlayerId = gameDTO.timeControl.timeDecreasingPlayerId;

            for (let player of this.getAllPlayers()) {
                if (this.timeDecreasingPlayerId === player.id && this.playerTime[player.id]) {
                    continue;
                }

                this.playerTime[player.id] = gameDTO.timeControl?.playersTime
                    .find(v => v.player === player.id)?.time ?? 0;
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

        if (this.rebuildSpaceshipManager.isRebuildingSpaceship) {
            this.rebuildSpaceshipManager.setIsRebuildSpaceshipAllowed(true);
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
