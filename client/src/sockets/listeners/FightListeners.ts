import {Event} from "@common/events/Event";
import Spaceship from "@common/Spaceship";
import {AttackReason} from "@common/Types";
import Vector2 from "@common/Vector2";

import Game from "../../Game";
import {COLORS} from "../../graphics/constants";
import SocketManager from "../SocketManager";
import Color from "../../graphics/Color";
import {ListenersContainer} from "./ListenersContainer";
import {
    chooseCardTypeResponse, choosePlayerForAttackResponse,
    drawAdditionalModuleCardResponse,
    drawAnotherEventCardResponse,
    rebuildSpaceshipResponse
} from "@common/actions/Main";


export const mainListeners: ListenersContainer = {
    async rebuildSpaceshipRequest({}, {game}) {
        game.rebuildSpaceshipManager.setIsRebuildSpaceshipAllowed(true);

        await game.controlsScene.rebuildSpaceship();
        game.rebuildSpaceshipManager.setIsRebuildSpaceshipAllowed(false);

        return rebuildSpaceshipResponse(game.currentPlayer.spaceship, game.currentPlayer.hand);
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

    async choosePlayerForAttackRequest({reason}, {game}) {
        const chosen = await game.controlsScene.choosePlayerForAttack(game.otherPlayers, reason);
        return choosePlayerForAttackResponse(chosen);
    }
}