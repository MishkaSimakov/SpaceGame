import BaseEventListener from "./BaseEventListener";
import Module, {ModuleTypes} from "../../../../common/modules/Module";
import Game from "../../Game";
import {COLORS} from "../../graphics/constants";
import Vector2 from "../../../../common/Vector2";
import SocketManager from "../SocketManager";

export default class FightEventListener extends BaseEventListener {
    socket: SocketManager;
    game: Game;

    constructor(...args: ConstructorParameters<typeof BaseEventListener>) {
        super(...args);
    }

    addListeners(): void {
        this.socket.on('chooseProtectors', (callback: (protector?: Vector2) => void) => {
            let selectedProtector: Module;

            this.controls().topBarDrawer.setStatus("выберите протектор");

            this.controls().topBarDrawer.addButtons([{
                text: "Далее",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    callback(selectedProtector?.getPosition());

                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);

            this.game.spaceshipsScene.chooseModule((module?: Module) => {
                selectedProtector = module;
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== this.game.getLink())
                    return false;

                if (module.type !== ModuleTypes.SmallQuantumProtector && module.type !== ModuleTypes.QuantumProtector)
                    return false;

                return true;
            }, false, 0xa3b18a);
        });

        this.socket.on('willYouRunaway', (callback: (isTryingToRunaway: boolean) => void) => {
            this.controls().topBarDrawer.setStatus("будете ли вы сбегать?")

            this.controls().topBarDrawer.addButtons([{
                text: "Да",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    callback(true);

                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }, {
                text: "Нет",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    callback(false);

                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);
        });

        this.socket.on('chooseWeaponAndTarget', (targetPlayerLink: number, callback: (weaponPosition: Vector2, targetPosition: Vector2) => void) => {
            let selectedWeapon: Module;
            let selectedTarget: Module;

            this.controls().topBarDrawer.setStatus("выберите цель и оружие");

            this.controls().topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (selectedWeapon === undefined || selectedTarget === undefined)
                        return;

                    callback(selectedWeapon.getPosition(), selectedTarget.getPosition());

                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);

            this.controls().topBarDrawer.setButtonsDisabled(true);

            this.game.spaceshipsScene.chooseModule((module?: Module) => {
                selectedWeapon = module;

                this.controls().topBarDrawer.setButtonsDisabled(
                    (selectedWeapon === undefined) || (selectedTarget === undefined)
                );
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== this.game.getLink())
                    return false;

                if (module.energyCost > this.game.getCurrentPlayer().energy)
                    return false;

                return module.strength > 0;
            }, true, 0xa3b18a);

            this.game.spaceshipsScene.chooseModule((module?: Module) => {
                selectedTarget = module;

                this.controls().topBarDrawer.setButtonsDisabled(
                    (selectedWeapon === undefined) || (selectedTarget === undefined)
                );
            }, (module?: Module, playerLink?: number) => {
                return playerLink === targetPlayerLink;
            }, true, 0xe76f51);
        });

        this.socket.on('chooseTarget', (targetPlayerLink: number, usedWeapon: Module, callback: (targetPosition: Vector2) => void) => {
            let selectedTarget: Module;

            this.controls().topBarDrawer.setStatus("выберите цель");

            this.controls().topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (selectedTarget === undefined)
                        return;

                    callback(selectedTarget.getPosition());

                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);

            this.controls().topBarDrawer.setButtonsDisabled(true);

            this.game.spaceshipsScene.chooseModule((module?: Module) => {
                selectedTarget = module;

                this.controls().topBarDrawer.setButtonsDisabled(selectedTarget === undefined);
            }, (module?: Module, playerLink?: number) => {
                return playerLink === targetPlayerLink;
            }, true, 0xe76f51);
        });
    }
}