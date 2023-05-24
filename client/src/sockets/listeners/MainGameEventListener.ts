import BaseEventListener from "./BaseEventListener";
import Module, {ModuleTypes} from "../../../../common/modules/Module";
import Game from "../../Game";
import Player from "../../../../common/Player";
import {COLORS} from "../../graphics/constants";
import {AttackReason} from "../../../../common/Types";
import Vector2 from "../../../../common/Vector2";
import SocketManager from "../SocketManager";

export default class MainGameEventListener extends BaseEventListener {
    socket: SocketManager;
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

        this.socket.on('chooseModuleToRepair', (callback: (modulePosition?: Vector2) => void) => {
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

            this.controls().topBarDrawer.setStatus("починка модуля");

            this.controls().topBarDrawer.addButtons([{
                text: "Починить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();

                    callback(chosenModule?.getPosition());
                }
            }]);
        });

        this.socket.on('choosePlayerForAttack', (attackReason: AttackReason, callback: (link: number) => {}) => {
            let otherPlayers = this.game.players.filter(p => p.link !== this.game.getCurrentPlayer().link);

            this.controls().choosePlayerForAttack(otherPlayers, attackReason).then(callback);
        });

        this.socket.on('chooseCardType', (callback: (cardType: string) => void) => {
            this.controls().topBarDrawer.setStatus("выберите тип карты")

            this.controls().topBarDrawer.addButtons([{
                text: "Строительства",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    callback('module');

                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }, {
                text: "Действия",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    callback('event');

                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);
        });

        this.socket.on('discardCards', (callback: (discardedCardsIndexes: number[]) => void) => {
            let requiredDiscardCount = this.game.getCurrentPlayer().hand.length - 5;

            this.game.controlsScene.discardCards(requiredDiscardCount).then(callback);
        });

        this.socket.on('drawAnotherEventCard', (callback: (drawAnotherEventCard: boolean) => void) => {
            this.controls().topBarDrawer.setStatus("взять другую карточку действия?");

            this.controls().askYesOrNo().then(callback);
        });

        this.socket.on('drawAdditionalModuleCard', (callback: (drawAdditionalModuleCard: boolean) => void) => {
            this.controls().topBarDrawer.setStatus("взять дополнительную карточку строительства?");

            this.controls().askYesOrNo().then(callback);
        });

        this.socket.on('askForUseModuleSecondTime', async (module: ModuleTypes, callback: (useSecondTime: boolean) => void) => {
            let moduleNames: Partial<Record<ModuleTypes, string>> = {
                [ModuleTypes.AttackModule]: "абордажный модуль",
                [ModuleTypes.RepairModule]: "ремонтный модуль",

                [ModuleTypes.SpaceSolver]: "космический порешатель",
                [ModuleTypes.IonDestroyer]: "ионный разрушитель",
                [ModuleTypes.QuantumDestabilizer]: "квантовый дестабилизатор",
            };

            this.controls().topBarDrawer.setStatus(`использовать ${moduleNames[module]} второй раз?`);

            this.controls().askYesOrNo().then(callback);
        });
    }
}