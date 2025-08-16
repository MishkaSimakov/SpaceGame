import Actions from "@common/actions/Main";
import {ModuleType} from "@common/modules/Module";

import {COLORS} from "../../graphics/constants";
import {ListenersContainer} from "./ListenersContainer";
import {ChoosePlayerForAttackActivity} from "../../graphics/activities/ChoosePlayerForAttack";
import Vector2 from "@common/Vector2";

const {
    chooseCardTypeResponse,
    chooseModuleToRepairResponse,
    choosePlayerForAttackResponse,
    discardCardsResponse,
    drawAdditionalModuleCardResponse,
    drawAnotherEventCardResponse,
    rebuildSpaceshipResponse,
    useModuleSecondTimeResponse
} = Actions;

export const mainListeners: ListenersContainer = {
    async rebuildSpaceshipRequest({}, {game}) {
        game.rebuildSpaceshipManager.setIsRebuildSpaceshipAllowed(true);

        await game.controlsScene.rebuildSpaceship();
        game.rebuildSpaceshipManager.setIsRebuildSpaceshipAllowed(false);

        return rebuildSpaceshipResponse(game.currentPlayer.spaceship.modules.map(module => ({
            id: module.id,
            position: new Vector2(module.x, module.y),
            rotation: module.rotation
        })));
    },

    async chooseCardTypeRequest({}, {game}) {
        game.controlsScene.topBarDrawer.setStatus("выберите тип карты")

        const chosenType = await new Promise<'module' | 'event'>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Строительства",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve('module');

                    game.controlsScene.topBarDrawer.removeButtons();
                    game.controlsScene.topBarDrawer.clearStatus();
                    game.spaceshipsScene.endChoosingModule();
                }
            }, {
                text: "Действия",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve('event');

                    game.controlsScene.topBarDrawer.removeButtons();
                    game.controlsScene.topBarDrawer.clearStatus();
                    game.spaceshipsScene.endChoosingModule();
                }
            }]);
        });

        return chooseCardTypeResponse(chosenType);
    },

    async drawAnotherEventCardRequest({}, {game}) {
        game.controlsScene.topBarDrawer.setStatus("взять другую карточку действия?");
        const response = await game.controlsScene.askYesOrNo();
        return drawAnotherEventCardResponse(response);
    },

    async drawAdditionalModuleCardRequest({}, {game}) {
        game.controlsScene.topBarDrawer.setStatus("взять дополнительную карточку строительства?");
        const response = await game.controlsScene.askYesOrNo();
        return drawAdditionalModuleCardResponse(response);
    },

    async choosePlayerForAttackRequest({reason, required}, {game}) {
        const chosen = await game.controlsScene.enqueueActivity(
            new ChoosePlayerForAttackActivity(game.controlsScene, game.otherPlayers, reason, required)
        );
        return choosePlayerForAttackResponse(chosen);
    },

    async discardCardsRequest({}, {game}) {
        const requiredDiscardCount = game.getCurrentPlayer().hand.length - game.settings.maxCardsOnHand;

        const indexes = await game.controlsScene.discardCards(requiredDiscardCount);
        return discardCardsResponse(indexes);
    },

    async chooseModuleToRepairRequest({}, {game}) {
        const positions = await game.controlsScene.chooseModulesToRepair(
            `починить с помощью ремонтного модуля`,
            1
        );


        return chooseModuleToRepairResponse(positions[0]);
    },

    async useModuleSecondTimeRequest({moduleType}, {game}) {
        let moduleNames: Partial<Record<ModuleType, string>> = {
            [ModuleType.AttackModule]: "абордажный модуль",
            [ModuleType.RepairModule]: "ремонтный модуль",

            [ModuleType.SpaceSolver]: "космический порешатель",
            [ModuleType.IonDestroyer]: "ионный разрушитель",
            [ModuleType.QuantumDestabilizer]: "квантовый дестабилизатор",
        };

        game.controlsScene.topBarDrawer.setStatus(`использовать ${moduleNames[moduleType]} второй раз?`);

        const result = await game.controlsScene.askYesOrNo();
        return useModuleSecondTimeResponse(result);
    }
}