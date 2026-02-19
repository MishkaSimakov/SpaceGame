import {
    chooseProtectorResponse,
    chooseTargetResponse,
    chooseWeaponAndTargetResponse,
    tryToRunawayResponse
} from "@common/Actions";
import {RunawayType, Vector2} from "@common/Types";
import {ModuleGetters} from "@common/getters/Module";

import {COLORS} from "../../graphics/constants";
import Color from "@common/helpers/Color";
import {ListenersContainer} from "./ListenersContainer";
import {Boundary} from "../../graphics/CountBoundary";

export const fightListeners: ListenersContainer = {
    async tryToRunawayRequest({type}, {game}) {
        const message = type === RunawayType.MainModule
            ? "будете ли вы сбегать, используя командный модуль?"
            : "будете ли вы сбегать?";

        game.controlsScene.topBarDrawer.setStatus(message)

        const response = await game.controlsScene.askYesOrNo();

        return tryToRunawayResponse(response);
    },

    async chooseProtectorRequest({}, {game}) {
        game.controlsScene.topBarDrawer.setStatus("выберите протектор");

        const protectorHandle = game.cardsManager.startChoosingModules(
            ({module, player}) => player === game.getCurrentPlayer().id && ModuleGetters.isProtector(module),
            Boundary.noMoreThan(1),
            Color.fromHex('#a3b18a')
        );

        const validate = () => {
            game.controlsScene.topBarDrawer.setButtonDisabled('activate',
                protectorHandle.get().length !== 1
            );
        };

        protectorHandle.subscribe(validate);

        const position = await new Promise<Vector2 | undefined>(resolve => {
            game.controlsScene.topBarDrawer.addButtons([
                {
                    text: "Активировать",
                    color: COLORS.BUTTON.PRIMARY,
                    onClick: () => {
                        resolve(ModuleGetters.position(protectorHandle.get()[0].module));
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
        game.cardsManager.endChoosingModules();

        return chooseProtectorResponse(position);
    },

    async chooseWeaponAndTargetRequest({victim}, {game}) {
        game.controlsScene.topBarDrawer.setStatus("выберите цель и оружие");

        const weaponHandle = game.cardsManager.startChoosingModules(
            ({module, player}) =>
                player === game.getCurrentPlayer().id
                && module.energyCost <= game.getCurrentPlayer().energy
                && module.strength > 0,
            Boundary.equal(1),
            Color.fromHex('#a3b18a')
        );

        const targetHandle = game.cardsManager.startChoosingModules(
            ({player}) => player === victim,
            Boundary.equal(1),
            Color.fromHex('#e76f51')
        );

        const validate = () => {
            game.controlsScene.topBarDrawer.setAllButtonsDisabled(
                weaponHandle.get().length !== 1 || targetHandle.get().length !== 1
            );
        };

        weaponHandle.subscribe(validate);
        targetHandle.subscribe(validate);

        const {weaponPosition, targetPosition} = await new Promise<{
            weaponPosition: Vector2,
            targetPosition: Vector2
        }>(resolve => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve({
                        weaponPosition: ModuleGetters.position(weaponHandle.get()[0].module),
                        targetPosition: ModuleGetters.position(targetHandle.get()[0].module)
                    });
                }
            }]);

            validate();
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.cardsManager.endChoosingModules();

        return chooseWeaponAndTargetResponse(targetPosition, weaponPosition);
    },

    async chooseTargetRequest({victim}, {game}) {
        game.controlsScene.topBarDrawer.setStatus("выберите цель");

        const targetHandle = game.cardsManager.startChoosingModules(
            ({player}) => player === victim,
            Boundary.equal(1),
            Color.fromHex('#e76f51')
        );

        const validate = () => {
            game.controlsScene.topBarDrawer.setAllButtonsDisabled(
                targetHandle.get().length !== 1
            );
        };

        targetHandle.subscribe(validate);

        const target = await new Promise<Vector2>(resolve => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve(ModuleGetters.position(targetHandle.get()[0].module));
                }
            }]);

            validate();
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.cardsManager.endChoosingModules();

        return chooseTargetResponse(target);
    }
}