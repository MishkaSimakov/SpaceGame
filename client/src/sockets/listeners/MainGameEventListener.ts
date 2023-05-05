import BaseEventListener from "./BaseEventListener";
import Spaceships from "../../graphics/scenes/game/spaceships";
import Controls from "../../graphics/scenes/game/controls";
import {Socket} from "socket.io-client";
import Module from "../../../../common/modules/Module";
import {Event} from "../../../../common/events/Event";
import Game from "../../Game";
import Player from "../../../../common/Player";
import {COLORS} from "../../graphics/constants";

export default class MainGameEventListener extends BaseEventListener {
    socket: Socket;
    game: Game;

    constructor(...args: ConstructorParameters<typeof BaseEventListener>) {
        super(...args);
    }

    addListeners(): void {
        this.socket.on('rebuildSpaceship', (player: Player, callback: (player: Player) => void) => {
            this.rebuildSpaceshipManager().setIsRebuildSpaceshipAllowed(true);

            this.controls().rebuildSpaceship().then(() => {
                this.rebuildSpaceshipManager().setIsRebuildSpaceshipAllowed(false);

                callback(this.game.getCurrentPlayer());
            });

            // this.player = plainToClass(player, Player.getPropertiesMap());
            //
            // this.controls.drawHand(this.player.hand);
            // this.controls.drawStatusBar(this.player);
            //
            // this.rebuildSpaceshipManager.player = this.player;
            // this.rebuildSpaceshipManager.controls = this.controls;

            // check later
            // this.getCurrentPlayer().energy = player.energy;
            // this.controls.setEnergy(this.getCurrentPlayer().energy);

            // this.controls.setStatus("Your turn");
        });

        this.socket.on('chooseModuleToRepair', (callback: (modulePosition?: [number, number]) => void) => {
            let chosenModule: Module;

            this.game.spaceshipsScene.chooseModule((module) => {
                chosenModule = module;
            }, (module, playerLink) => {
                if (playerLink !== this.game.getCurrentPlayer().link)
                    return false;

                if (module.health === module.totalHealth)
                    return false;

                return true;
            }, false, 0xe76f51);

            this.controls().topBarDrawer.setStatus("Починка модуля");

            this.controls().topBarDrawer.addButtons([{
                text: "Починить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    this.controls().topBarDrawer.removeButtons();
                    this.game.spaceshipsScene.endChoosingModule();

                    if (chosenModule !== undefined) {
                        callback([chosenModule.x, chosenModule.y]);
                    } else {
                        callback();
                    }
                }
            }]);
        });

        this.socket.on('willYouFight', (playersLinks: number[], callback: (link: number) => {}) => {
            this.controls().choosePlayerForAttack(
                this.game.players.filter(p => p.link !== this.game.getCurrentPlayer().link)
            ).then(callback);
        });

        this.socket.on('chooseCardType', (callback: (cardType: string) => void) => {
            this.controls().chooseCardType().then(callback);
        });

        this.socket.on('discardCards', (callback: (discardedCardsIndexes: number[]) => void) => {
            let requiredDiscardCount = this.game.getCurrentPlayer().hand.length - 5;

            this.game.controlsScene.discardCards(requiredDiscardCount).then(callback);
        });
    }
}