import Spaceships from "./graphics/scenes/game/spaceships";
import Controls from "./graphics/scenes/game/controls";
import Player from "../../common/Player";
import RebuildSpaceshipManager from "./graphics/RebuildSpaceshipManager";
import {plainToClass} from "../../common/PlainToClass";
import SocketManager from "./sockets/SocketManager";
import config from "./config";
import {Event, EventTypes} from "../../common/events/Event";
import {GameForPlayerDTO, GameSettings, OtherPlayer} from "../../common/GameForPlayerDTO";

export default class Game {
    currentPlayer: Player;
    otherPlayers: OtherPlayer[];

    socketManager: SocketManager;

    spaceshipsScene: Spaceships;
    controlsScene: Controls;
    rebuildSpaceshipManager: RebuildSpaceshipManager;

    settings: GameSettings = {
        withTimeControl: false
    };

    constructor() {
        this.spaceshipsScene = new Spaceships(this);
        this.controlsScene = new Controls(this);

        config.scene.push(this.spaceshipsScene);
        config.scene.push(this.controlsScene);

        const game = new Phaser.Game(config);

        game.events.once('ready', () => {
            this.onReady();
        });
    }

    getLink(): number {
        return parseInt(window.location.href.split('/').pop());
    }

    onReady() {
        this.rebuildSpaceshipManager = new RebuildSpaceshipManager(this);

        this.socketManager = new SocketManager(this);
    }

    setGameData(gameDTO: GameForPlayerDTO) {
        console.log(gameDTO);

        if (!this.rebuildSpaceshipManager.isRebuildingSpaceship)
            this.currentPlayer = plainToClass(gameDTO.player, Player.getPropertiesMap());

        this.otherPlayers = gameDTO.otherPlayers
            .map(p => plainToClass(p, OtherPlayer.getPropertiesMap()));

        this.settings = gameDTO.settings;

        this.redraw();
    }

    redraw() {
        this.controlsScene.redraw();
        this.spaceshipsScene.redraw();
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