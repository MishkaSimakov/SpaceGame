import {
    EventType,
    GameForPlayerDTO,
    GameSettings, MainModuleType,
    Message,
    ModuleType,
    OtherPlayer,
    Player,
    PlayerId
} from "@common/Types";
import {PlayerGetters} from "@common/getters/Player";

import Spaceships from "./graphics/scenes/Spaceships";
import Controls from "./graphics/scenes/Controls";
import SocketManager from "./sockets/SocketManager";
import {Graphics} from "./graphics/engine/Graphics";
import PopupsScene from "./graphics/scenes/Popups";
import {Cheats} from "./Cheats";
import Scene from "./graphics/engine/Scene";
import {CardsManager} from "./graphics/cards/CardsManager";

export default class Game {
    currentTurnPlayerId: PlayerId;

    isPaused: boolean;
    currentPlayer: Player;
    otherPlayers: OtherPlayer[];
    onlineMap: GameForPlayerDTO["onlineMap"] = [];

    socketManager: SocketManager;

    spaceshipsScene: Spaceships;
    handScene: Scene;
    controlsScene: Controls;
    popupsScene: PopupsScene;

    cardsManager: CardsManager;

    settings: GameSettings;

    playerTime: Record<PlayerId, number> = {};
    timeDecreasingPlayerId: number;

    messages: Message[] = [];
    cheats: Cheats | undefined;

    constructor() {
        const graphics = new Graphics({
            container: 'app',
            width: window.innerWidth,
            height: window.innerHeight
        });

        this.spaceshipsScene = new Spaceships(this);
        this.handScene = new Scene();
        this.controlsScene = new Controls(this);
        this.popupsScene = new PopupsScene(this);

        graphics.add(this.spaceshipsScene);
        graphics.add(this.handScene);
        graphics.add(this.controlsScene);
        graphics.add(this.popupsScene);

        this.cardsManager = new CardsManager(
            this.getGameId(), this.spaceshipsScene, this.handScene, this.popupsScene
        );

        this.socketManager = new SocketManager(this);

        let prevTime = (new Date()).getTime();
        setInterval(() => {
            if (!this.settings || !this.settings.timeControlSettings || !this.timeDecreasingPlayerId) {
                return;
            }

            const currTime = (new Date()).getTime();
            if (this.timeDecreasingPlayerId in this.playerTime && !this.isPaused) {
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
            this.handScene.setSize(newSize);
            this.controlsScene.setSize(newSize);
            this.popupsScene.setSize(newSize);

            this.controlsScene.activitiesQueue[0]?.activity.update();
            this.controlsScene.pauseDrawer.update();
            this.popupsScene.update();
            this.cardsManager.resize();

            this.redraw([]);
        });
    }

    setGameData(gameDTO: GameForPlayerDTO) {
        this.isPaused = gameDTO.isPaused;
        this.currentTurnPlayerId = gameDTO.currentTurnPlayerId;
        this.onlineMap = gameDTO.onlineMap;
        this.otherPlayers = gameDTO.otherPlayers;
        this.settings = gameDTO.settings;
        this.currentPlayer = gameDTO.player;

        // enable cheats for debug
        if (this.settings.isDebug && !this.cheats) {
            this.cheats = new Cheats(this, this.socketManager);
            window["cheats"] = this.cheats;
            window["ModuleType"] = ModuleType;
            window["EventType"] = EventType;
            window["MainModuleType"] = MainModuleType;
        }

        // time control
        if (this.settings.timeControlSettings) {
            this.timeDecreasingPlayerId = gameDTO.timeControl.timeDecreasingPlayerId;

            for (const player of this.getAllPlayers()) {
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

    private redraw(newMessages: Message[]) {
        this.controlsScene.updateData(newMessages);
        this.cardsManager.setData(this.currentPlayer, this.otherPlayers, this.settings);
    }

    panToPlayer(id: PlayerId) {
        const position = this.cardsManager.getPlayerSpaceshipPosition(id);

        if (position) {
            this.spaceshipsScene.panTo(position);
        }
    }

    getCurrentPlayer(): Player | undefined {
        return this.currentPlayer;
    }

    getAllPlayers(): OtherPlayer[] {
        const allPlayers: OtherPlayer[] = [];

        allPlayers.push(...this.otherPlayers);
        allPlayers.push(PlayerGetters.forOtherPlayer(this.currentPlayer));

        return allPlayers;
    }

    getPlayerById(id: number): OtherPlayer {
        if (id === this.currentPlayer.id)
            return PlayerGetters.forOtherPlayer(this.currentPlayer);

        for (const player of this.otherPlayers) {
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

    getGameId(): string {
        return window.location.href.split('/').pop();
    }
}
