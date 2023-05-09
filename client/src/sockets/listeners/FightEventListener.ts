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

            this.controls().topBarDrawer.setStatus("Выберите протектор");

            this.controls().topBarDrawer.addButtons([{
                text: "Далее",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    if (selectedProtector !== undefined)
                        callback(selectedProtector.getPosition());
                    else
                        callback();

                    this.controls().topBarDrawer.removeButtons();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);

            this.game.spaceshipsScene.chooseModule((module?: Module) => {
                selectedProtector = module;
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== this.game.link)
                    return false;

                if (module.type !== ModuleTypes.SmallQuantumProtector && module.type !== ModuleTypes.QuantumProtector)
                    return false;

                return true;
            }, false, 0xa3b18a);
        });

        this.socket.on('willYouRunaway', (callback: (isTryingToRunaway: boolean) => void) => {
            this.game.controlsScene.askForRunaway().then((isTryingToRunaway: boolean) => {
                callback(isTryingToRunaway);
            });
        });

        this.socket.on('chooseWeaponAndTarget', (targetPlayerLink: number, callback: (weaponPosition: Vector2, targetPosition: Vector2) => void) => {
            let selectedWeapon: Module;
            let selectedTarget: Module;

            this.controls().topBarDrawer.setStatus("Выберите цель и оружие");

            this.controls().topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (selectedWeapon === undefined && selectedTarget === undefined)
                        return;

                    callback(selectedWeapon.getPosition(), selectedTarget.getPosition());

                    this.controls().topBarDrawer.removeButtons();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);

            this.game.spaceshipsScene.chooseModule((module?: Module) => {
                selectedWeapon = module;
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== this.game.link)
                    return false;

                return module.strength > 0;
            }, true, 0xa3b18a);

            this.game.spaceshipsScene.chooseModule((module?: Module) => {
                selectedTarget = module;
            }, (module?: Module, playerLink?: number) => {
                return playerLink === targetPlayerLink;
            }, true, 0xe76f51);
        });

        this.socket.on('chooseTarget', (targetPlayerLink: number, usedWeapon: Module, callback: (targetPosition: Vector2) => void) => {
            let selectedTarget: Module;

            this.controls().topBarDrawer.setStatus("Выберите цель");

            this.controls().topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (selectedTarget === undefined)
                        return;

                    callback(selectedTarget.getPosition());

                    this.controls().topBarDrawer.removeButtons();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);

            this.game.spaceshipsScene.chooseModule((module?: Module) => {
                selectedTarget = module;
            }, (module?: Module, playerLink?: number) => {
                return playerLink === targetPlayerLink;
            }, true, 0xe76f51);
        });
    }
}