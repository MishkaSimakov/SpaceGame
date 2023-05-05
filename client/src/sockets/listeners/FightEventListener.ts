import BaseEventListener from "./BaseEventListener";
import Spaceships from "../../graphics/scenes/game/spaceships";
import Controls from "../../graphics/scenes/game/controls";
import {Socket} from "socket.io-client";
import Module, {ModuleTypes} from "../../../../common/modules/Module";
import Game from "../../Game";
import {COLORS} from "../../graphics/constants";

export default class FightEventListener extends BaseEventListener {
    socket: Socket;
    game: Game;

    constructor(...args: ConstructorParameters<typeof BaseEventListener>) {
        super(...args);
    }

    addListeners(): void {
        this.socket.on('chooseProtectors', (callback: (response: { protector?: [number, number] }) => void) => {
            let selectedProtector: Module;

            // this.topBar().setStatus("Select protector");

            // this.game.controlsScene.addButton("Next", () => {
            //     if (selectedProtector !== undefined)
            //         callback({
            //             protector: [selectedProtector.x, selectedProtector.y]
            //         });
            //     else
            //         callback({});
            //
            //     this.game.controlsScene.removeButtons();
            //
            //     this.game.spaceshipsScene.endChoosingModule();
            // });

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

        this.socket.on('willYouRunaway', (callback: (response: { tryToRunaway: boolean }) => void) => {
            this.game.controlsScene.askForRunaway().then((isRunningAway: boolean) => {
                callback({
                    tryToRunaway: isRunningAway
                });
            });
        });

        this.socket.on('chooseWeaponAndTarget', (targetPlayerLink: number, callback: (response: { weapon: [number, number], target: [number, number] }) => void) => {
            let selectedWeapon: Module;
            let selectedTarget: Module;

            this.controls().topBarDrawer.setStatus("Выберите цель и оружие");

            this.controls().topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (selectedWeapon === undefined && selectedTarget === undefined)
                        return;

                    callback({
                        weapon: [selectedWeapon.x, selectedWeapon.y],
                        target: [selectedTarget.x, selectedTarget.y]
                    });

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
    }
}