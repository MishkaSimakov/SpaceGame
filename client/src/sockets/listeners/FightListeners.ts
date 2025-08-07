import Vector2 from "@common/Vector2";
import {
    chooseProtectorResponse,
    chooseTargetResponse,
    chooseWeaponAndTargetResponse,
    RunawayType,
    tryToRunawayResponse,
} from "@common/actions/Main";
import Module, {isProtector} from "@common/modules/Module";

import {COLORS} from "../../graphics/constants";
import Color from "../../graphics/Color";
import {ListenersContainer} from "./ListenersContainer";
import {Boundary} from "../../graphics/CountBoundary";

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
        game.controlsScene.topBarDrawer.setStatus("выберите протектор");

        const protectorHandle = game.spaceshipsScene.chooseModules(
            ({module, player}) => player === game.getCurrentPlayer().id && isProtector(module),
            Boundary.noMoreThan(1),
            Color.fromHex('#a3b18a')
        );

        // TODO: count validation
        const position = await new Promise<Vector2 | undefined>(resolve => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Далее",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    const protector = protectorHandle.get()[0];
                    const position = protector
                        ? new Vector2(protector.module.x, protector.module.y)
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
        game.controlsScene.topBarDrawer.setStatus("выберите цель и оружие");

        const weaponHandle = game.spaceshipsScene.chooseModules(
            ({module, player}) =>
                player === game.getCurrentPlayer().id
                && module.energyCost <= game.getCurrentPlayer().energy
                && module.strength > 0,
            Boundary.equal(1),
            Color.fromHex('#a3b18a')
        );

        const targetHandle = game.spaceshipsScene.chooseModules(
            ({player}) => player === victim,
            Boundary.equal(1),
            Color.fromHex('#e76f51')
        );

        // TODO: add validation
        const {weaponPosition, targetPosition} = await new Promise<{
            weaponPosition: Vector2,
            targetPosition: Vector2
        }>(resolve => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    const weapon = weaponHandle.get()[0].module;
                    const target = targetHandle.get()[0].module;

                    resolve({
                        weaponPosition: new Vector2(weapon.x, weapon.y),
                        targetPosition: new Vector2(target.x, target.y)
                    });
                }
            }]);
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseWeaponAndTargetResponse(targetPosition, weaponPosition);
    },

    async chooseTargetRequest({victim}, {game}) {
        game.controlsScene.topBarDrawer.setStatus("выберите цель");

        const targetHandle = game.spaceshipsScene.chooseModules(
            ({player}) => player === victim,
            Boundary.equal(1),
            Color.fromHex('#e76f51')
        );

        // TODO: count validation
        const target = await new Promise<Vector2>(resolve => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    const target = targetHandle.get()[0].module;
                    resolve(new Vector2(target.x, target.y));
                }
            }]);

            game.controlsScene.topBarDrawer.setButtonsDisabled(true);
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseTargetResponse(target);
    }
}