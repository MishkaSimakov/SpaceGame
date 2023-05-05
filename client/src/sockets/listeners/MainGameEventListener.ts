import BaseEventListener from "./BaseEventListener";
import {Socket} from "socket.io-client";
import Module from "../../../../common/modules/Module";
import Game from "../../Game";
import Player from "../../../../common/Player";
import {COLORS} from "../../graphics/constants";
import {AttackReason} from "../../../../common/Types";
import {plainToClass} from "../../../../common/PlainToClass";

export default class MainGameEventListener extends BaseEventListener {
    socket: Socket;
    game: Game;

    constructor(...args: ConstructorParameters<typeof BaseEventListener>) {
        super(...args);
    }

    addListeners(): void {
        this.socket.on('rebuildSpaceship', (player: Player, callback: (player: Player) => void) => {
            this.game.setPlayersData([player]);

            // this.controls.drawHand(this.player.hand);
            // this.controls.drawStatusBar(this.player);
            //
            // this.rebuildSpaceshipManager.player = this.player;
            // this.rebuildSpaceshipManager.controls = this.controls;

            // check later
            // this.getCurrentPlayer().energy = player.energy;
            // this.controls.setEnergy(this.getCurrentPlayer().energy);

            // this.controls.setStatus("Your turn");

            this.rebuildSpaceshipManager().setIsRebuildSpaceshipAllowed(true);

            this.controls().rebuildSpaceship().then(() => {
                this.rebuildSpaceshipManager().setIsRebuildSpaceshipAllowed(false);

                callback(this.game.getCurrentPlayer());
            });
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

        this.socket.on('choosePlayerForAttack', (attackReason: AttackReason, callback: (link: number) => {}) => {
            let otherPlayers = this.game.players.filter(p => p.link !== this.game.getCurrentPlayer().link);

            this.controls().choosePlayerForAttack(otherPlayers, attackReason).then(callback);
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