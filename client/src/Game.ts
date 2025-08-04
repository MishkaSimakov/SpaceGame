import {GameSettings} from "@common/GameSettings";
import {GameForPlayerDTO, OtherPlayer} from "@common/GameForPlayerDTO";
import {Message} from "@common/Types";
import {plainToClass} from "@common/PlainToClass";
import {PlayerGetters} from "@common/getters/Player";

import Spaceships from "./graphics/scenes/spaceships";
import Controls from "./graphics/scenes/controls";
import Player, {PlayerId} from "../../common/Player";
import RebuildSpaceshipManager from "./graphics/RebuildSpaceshipManager";
import SocketManager from "./sockets/SocketManager";
import {Graphics} from "./graphics/engine/Graphics";
import {DD} from "./graphics/engine/Drag";

export default class Game {
    currentTurnPlayerId: PlayerId;

    currentPlayer: Player;
    otherPlayers: OtherPlayer[];
    onlineMap: Record<PlayerId, boolean> = {};

    socketManager: SocketManager;

    spaceshipsScene: Spaceships;
    controlsScene: Controls;
    rebuildSpaceshipManager: RebuildSpaceshipManager;

    settings: GameSettings;

    playerTime: Record<number, number> = {};
    timeDecreasingPlayerId: number;

    messages: Message[];

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

        graphics.add(this.spaceshipsScene);
        graphics.add(this.controlsScene);

        this.rebuildSpaceshipManager = new RebuildSpaceshipManager(this);

        this.socketManager = new SocketManager(this);

        let prevTime = (new Date()).getTime();
        setInterval(() => {
            if (!this.settings || !this.settings.withTimeControl)
                return;

            if (!this.timeDecreasingPlayerId)
                return;

            let currTime = (new Date()).getTime();
            this.playerTime[this.timeDecreasingPlayerId] -= (currTime - prevTime);
            prevTime = currTime;

            this.controlsScene.topBarDrawer.updateTime(this.playerTime);
        }, 1000);
    }

    setGameData(gameDTO: GameForPlayerDTO) {
        this.currentTurnPlayerId = gameDTO.currentTurnPlayerId;
        this.onlineMap = gameDTO.onlineMap;

        if (!this.rebuildSpaceshipManager.isRebuildingSpaceship)
            this.currentPlayer = plainToClass(gameDTO.player, Player.getPropertiesMap());

        this.otherPlayers = gameDTO.otherPlayers
            .map(p => plainToClass(p, OtherPlayer.getPropertiesMap()));

        this.settings = gameDTO.settings;

        // time control
        if (this.settings?.withTimeControl) {
            this.timeDecreasingPlayerId = gameDTO.timeControl.timeDecreasingPlayerId;

            for (let player of this.getAllPlayers()) {
                if (this.timeDecreasingPlayerId === player.id && this.playerTime[this.timeDecreasingPlayerId])
                    continue;

                this.playerTime[player.id] = gameDTO.timeControl.playersTime[player.id];
            }
        }

        this.messages = gameDTO.messages;

        this.updatePageTitle();

        this.redraw();
    }

    redraw() {
        this.controlsScene.updateData();
        this.spaceshipsScene.updateData();

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
