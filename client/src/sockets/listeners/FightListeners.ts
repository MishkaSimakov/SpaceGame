import Vector2 from "@common/Vector2";
import {
    chooseProtectorResponse,
    chooseTargetResponse,
    chooseWeaponAndTargetResponse,
    tryToRunawayResponse,
    RunawayType,
} from "@common/actions/Main";
import Module, {ModuleTypes} from "@common/modules/Module";

import {COLORS} from "../../graphics/constants";
import Color from "../../graphics/Color";
import {ListenersContainer} from "./ListenersContainer";

export const fightListeners: ListenersContainer = {
    async tryToRunawayRequest({type}, {game}) {
        const message = type === RunawayType.MAIN_MODULE
            ? "будете ли вы сбегать, используя командный модуль?"
            : "будете ли вы сбегать?";

        game.controlsScene.topBarDrawer.setStatus(message)

        const response = await game.controlsScene.askYesOrNo();

        return tryToRunawayResponse(response);
    },

    async chooseProtectorRequest({}, {game}) {
        let selectedProtector: Module;

        game.controlsScene.topBarDrawer.setStatus("выберите протектор");

        game.spaceshipsScene.chooseModule((module?: Module) => {
            selectedProtector = module;
        }, (module?: Module, playerId?: number) => {
            if (playerId !== game.currentPlayer.id)
                return false;

            if (module.type !== ModuleTypes.SmallQuantumProtector && module.type !== ModuleTypes.QuantumProtector)
                return false;

            return true;
        }, false, Color.fromHex('#a3b18a'));

        const position = await new Promise<Vector2 | undefined>(resolve => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Далее",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    const position = selectedProtector
                        ? new Vector2(selectedProtector.x, selectedProtector.y)
                        : undefined;

                    resolve(position);
                }
            }]);
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseProtectorResponse(position);
    },

    async chooseWeaponAndTargetRequest({victim}, {game}) {
        let selectedWeapon: Module;
        let selectedTarget: Module;

        game.controlsScene.topBarDrawer.setStatus("выберите цель и оружие");

        game.spaceshipsScene.chooseModule((module?: Module) => {
            selectedWeapon = module;

            game.controlsScene.topBarDrawer.setButtonsDisabled(
                (selectedWeapon === undefined) || (selectedTarget === undefined)
            );
        }, (module?: Module, playerId?: number) => {
            if (playerId !== game.currentPlayer.id)
                return false;

            if (module.energyCost > game.getCurrentPlayer().energy)
                return false;

            return module.strength > 0;
        }, true, Color.fromHex('#a3b18a'));

        game.spaceshipsScene.chooseModule((module?: Module) => {
            selectedTarget = module;

            game.controlsScene.topBarDrawer.setButtonsDisabled(
                (selectedWeapon === undefined) || (selectedTarget === undefined)
            );
        }, (module?: Module, playerId?: number) => {
            return playerId === victim;
        }, true, Color.fromHex('#e76f51'));

        const {weaponPosition, targetPosition} = await new Promise<{
            weaponPosition: Vector2,
            targetPosition: Vector2
        }>(resolve => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (selectedWeapon === undefined || selectedTarget === undefined)
                        return;

                    resolve({
                        weaponPosition: new Vector2(selectedWeapon.x, selectedWeapon.y),
                        targetPosition: new Vector2(selectedTarget.x, selectedTarget.y)
                    });
                }
            }]);

            game.controlsScene.topBarDrawer.setButtonsDisabled(true);
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseWeaponAndTargetResponse(targetPosition, weaponPosition);
    },

    async chooseTargetRequest({victim}, {game}) {
        let selectedTarget: Module;

        game.controlsScene.topBarDrawer.setStatus("выберите цель");

        game.spaceshipsScene.chooseModule((module?: Module) => {
            selectedTarget = module;

            game.controlsScene.topBarDrawer.setButtonsDisabled(selectedTarget === undefined);
        }, (module?: Module, playerLink?: number) => {
            return playerLink === victim;
        }, true, Color.fromHex('#e76f51'));

        const target = await new Promise<Vector2>(resolve => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (selectedTarget === undefined)
                        return;

                    resolve(new Vector2(selectedTarget.x, selectedTarget.y));

                    game.controlsScene.topBarDrawer.removeButtons();
                    game.controlsScene.topBarDrawer.clearStatus();
                    game.spaceshipsScene.endChoosingModule();
                }
            }]);

            game.controlsScene.topBarDrawer.setButtonsDisabled(true);
        });

        return chooseTargetResponse(target);
    }
}