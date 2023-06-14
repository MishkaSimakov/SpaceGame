import Spaceships from "./graphics/scenes/spaceships";
import Controls from "./graphics/scenes/controls";
import Player from "../../common/Player";
import RebuildSpaceshipManager from "./graphics/RebuildSpaceshipManager";
import {plainToClass} from "../../common/PlainToClass";
import SocketManager from "./sockets/SocketManager";
import {Event, EventTypes} from "../../common/events/Event";
import {GameForPlayerDTO, GameSettings, OtherPlayer} from "../../common/GameForPlayerDTO";
import {Message} from "../../common/Types";
import {Graphics} from "./graphics/engine/Graphics";

export default class Game {
    currentPlayer: Player;
    otherPlayers: OtherPlayer[];

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

        this.spaceshipsScene = new Spaceships(this);
        this.controlsScene = new Controls(this);

        graphics.add(this.spaceshipsScene);
        graphics.add(this.controlsScene);

        this.spaceshipsScene.adopted();
        this.controlsScene.adopted();

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
