import Vector2 from "@common/Vector2";
import Actions from "@common/actions/Main";
import {isProtector} from "@common/modules/Module";

import {COLORS} from "../../graphics/constants";
import Color from "../../graphics/Color";
import {ListenersContainer} from "./ListenersContainer";
import {Boundary} from "../../graphics/CountBoundary";
import {Button} from "../../graphics/shapes/Button";
import {RunawayType} from "@common/actions/EventCards";

const {
    chooseProtectorResponse,
    chooseTargetResponse,
    chooseWeaponAndTargetResponse,
    tryToRunawayResponse,
} = Actions;

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

        const validate = () => {
            game.controlsScene.topBarDrawer.setButtonDisabled('activate',
                protectorHandle.get().length !== 1
            );
        };

        protectorHandle.onSet(validate);

        const position = await new Promise<Vector2 | undefined>(resolve => {
            game.controlsScene.topBarDrawer.addButtons([
                {
                    text: "Активировать",
                    color: COLORS.BUTTON.PRIMARY,
                    onClick: () => {
                        resolve(Vector2.modulePosition(protectorHandle.get()[0].module));
                    },
                    name: 'activate'
                },
                {
                    text: "Пропустить",
                    color: COLORS.BUTTON.PRIMARY,
                    onClick: () => {
                        resolve(undefined);
                    }
                }
            ]);

            validate();
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

        const validate = () => {
            game.controlsScene.topBarDrawer.setAllButtonsDisabled(
                weaponHandle.get().length !== 1 || targetHandle.get().length !== 1
            );
        };

        weaponHandle.onSet(validate);
        targetHandle.onSet(validate);

        const {weaponPosition, targetPosition} = await new Promise<{
            weaponPosition: Vector2,
            targetPosition: Vector2
        }>(resolve => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve({
                        weaponPosition: Vector2.modulePosition(weaponHandle.get()[0].module),
                        targetPosition: Vector2.modulePosition(targetHandle.get()[0].module)
                    });
                }
            }]);

            validate();
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

        const validate = () => {
            game.controlsScene.topBarDrawer.setAllButtonsDisabled(
                targetHandle.get().length !== 1
            );
        };

        targetHandle.onSet(validate);

        const target = await new Promise<Vector2>(resolve => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve(Vector2.modulePosition(targetHandle.get()[0].module));
                }
            }]);

            validate();
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseTargetResponse(target);
    }
}