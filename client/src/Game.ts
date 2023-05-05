import Spaceships from "./graphics/scenes/game/spaceships";
import Controls from "./graphics/scenes/game/controls";
import Player from "../../common/Player";
import RebuildSpaceshipManager from "./graphics/RebuildSpaceshipManager";
import {plainToClass} from "../../common/PlainToClass";
import SocketManager from "./sockets/SocketManager";
import config from "./config";

export default class Game {
    link: number;
    players: Player[] = [];
    socketManager: SocketManager;

    spaceshipsScene: Spaceships;
    controlsScene: Controls;
    rebuildSpaceshipManager: RebuildSpaceshipManager;

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

    onReady() {
        // this.controlsScene.init();

        this.rebuildSpaceshipManager = new RebuildSpaceshipManager(this.spaceshipsScene, this.controlsScene);
        this.link = parseInt(window.location.href.split('/').pop());

        this.socketManager = new SocketManager(this);
    }

    setPlayersData(players: Player[]) {
        for (let player of players) {
            this.changePlayerData(
                plainToClass(player, Player.getPropertiesMap())
            );
        }

        this.controlsScene.playersDataUpdated();
        this.spaceshipsScene.playersDataUpdated();

        this.rebuildSpaceshipManager.player = this.getCurrentPlayer();
    }

    getCurrentPlayer(): Player|undefined {
        return this.getPlayerByLink(this.link);
    }

    getPlayerByLink(link: number): Player {
        for (let i = 0; i < this.players.length; ++i) {
            if (this.players[i].link == link)
                return this.players[i];
        }
    }

    private changePlayerData(player: Player) {
        for (let i = 0; i < this.players.length; ++i) {
            if (this.players[i].link === player.link) {
                this.players[i] = player;
                return;
            }
        }

        this.players.push(player);
    }
}