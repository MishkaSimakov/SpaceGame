import {Event} from "@common/events/Event";
import Spaceship from "@common/Spaceship";
import {AttackReason} from "@common/Types";
import Vector2 from "@common/Vector2";

import Game from "../../Game";
import {COLORS} from "../../graphics/constants";
import SocketManager from "../SocketManager";
import Color from "../../graphics/Color";
import {ListenersContainer} from "./ListenersContainer";
import {chooseCardTypeResponse, rebuildSpaceshipResponse} from "@common/actions/Main";


export const mainListeners: ListenersContainer = {
    async rebuildSpaceshipRequest(payload, {game}) {
        game.rebuildSpaceshipManager.setIsRebuildSpaceshipAllowed(true);

        await game.controlsScene.rebuildSpaceship();
        game.rebuildSpaceshipManager.setIsRebuildSpaceshipAllowed(false);

        return rebuildSpaceshipResponse(game.currentPlayer.spaceship, game.currentPlayer.hand);
    },

    async chooseCardTypeRequest(payload, {game}) {
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
    }
};