import Spaceships from "./graphics/scenes/game/spaceships";
import Controls from "./graphics/scenes/game/controls";
import Player from "../../common/Player";
import RebuildSpaceshipManager from "./graphics/RebuildSpaceshipManager";
import {plainToClass} from "../../common/PlainToClass";
import SocketManager from "./sockets/SocketManager";
import config from "./config";
import {Event, EventTypes} from "../../common/events/Event";
import {GameForPlayerDTO, GameSettings, OtherPlayer} from "../../common/GameForPlayerDTO";
import {Message} from "../../common/Types";

export default class Game {
    currentPlayer: Player;
    otherPlayers: OtherPlayer[];

    socketManager: SocketManager;

    spaceshipsScene: Spaceships;
    controlsScene: Controls;
    rebuildSpaceshipManager: RebuildSpaceshipManager;

    settings: GameSettings;

    playerTime: Record<number, number> = {};
    timeDecreasingPlayerLink: number;

    messages: Message[];

    constructor() {
        this.spaceshipsScene = new Spaceships(this);
        this.controlsScene = new Controls(this);

        config.scene.push(this.spaceshipsScene);
        config.scene.push(this.controlsScene);

        const game = new Phaser.Game(config);

        game.events.once('ready', () => {
            this.onReady();
        });

        let prevTime = (new Date()).getTime();
        setInterval(() => {
            if (!this.settings.withTimeControl)
                return;

            if (!this.timeDecreasingPlayerLink)
                return;

            let currTime = (new Date()).getTime();
            this.playerTime[this.timeDecreasingPlayerLink] -= (currTime - prevTime);
            prevTime = currTime;

            this.controlsScene.topBarDrawer.updateTime(this.playerTime);
        }, 1000);
    }

    getLink(): number {
        return parseInt(window.location.href.split('/').pop());
    }

    onReady() {
        this.rebuildSpaceshipManager = new RebuildSpaceshipManager(this);

        this.socketManager = new SocketManager(this);
    }

    setGameData(gameDTO: GameForPlayerDTO) {
        if (!this.rebuildSpaceshipManager.isRebuildingSpaceship)
            this.currentPlayer = plainToClass(gameDTO.player, Player.getPropertiesMap());

        this.otherPlayers = gameDTO.otherPlayers
            .map(p => plainToClass(p, OtherPlayer.getPropertiesMap()));

        this.settings = gameDTO.settings;

        // time control
        if (this.settings.withTimeControl) {
            this.timeDecreasingPlayerLink = gameDTO.timeControl.timeDecreasingPlayerLink;

            for (let player of this.getAllPlayers()) {
                if (this.timeDecreasingPlayerLink === player.link && this.playerTime[this.timeDecreasingPlayerLink])
                    continue;

                this.playerTime[player.link] = gameDTO.timeControl.playersTime[player.link];
            }
        }

        this.messages = gameDTO.messages;

        this.redraw();
    }

    redraw() {
        this.controlsScene.redraw();
        this.spaceshipsScene.redraw();

        if (this.rebuildSpaceshipManager.isRebuildingSpaceship) {
            this.rebuildSpaceshipManager.allowRebuildSpaceship();
        }
    }

    getCurrentPlayer(): Player | undefined {
        return this.currentPlayer;
    }

    getAllPlayers(): OtherPlayer[] {
        let allPlayers: OtherPlayer[] = [];

        allPlayers.push(...this.otherPlayers);
        allPlayers.push(this.currentPlayer.getOtherPlayer());

        return allPlayers;
    }

    async useEventCard(event: Event): Promise<boolean> {
        if (event.type === EventTypes.SaveCardAndThenDealDamage) {
            // if (!this.getCurrentPlayer().isInFight) return false;

            return await this.socketManager.useEventCard(event);
        }
    }
}