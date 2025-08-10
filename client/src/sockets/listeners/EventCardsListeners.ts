import Actions from "@common/actions/Main";
import {isMainModule, ModuleType} from "@common/modules/Module";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import Vector2 from "@common/Vector2";

import {ListenersContainer} from "./ListenersContainer";
import Color from "../../graphics/Color";
import {COLORS} from "../../graphics/constants";
import {Button} from "../../graphics/shapes/Button";
import {Boundary} from "../../graphics/CountBoundary";

const {
    chooseCardsForRepairSpaceshipResponse,
    chooseCardsToDiscardAndTakeAnotherResponse,
    chooseCardToStealResponse,
    chooseModulesToRepairByDiscardedCardsResponse,
    chooseModuleToDamageByDiceResponse,
    chooseModuleToDamageByEventCardResponse,
    chooseModuleToDestroyResponse,
    chooseModuleToMoveDamageResponse,
    chooseModuleToRepairByDiceResponse,
    choosePlayerToStealCardResponse,
    chooseTwoSolarPanelsToDestroyResponse,
    permuteTopThreeEventCardsResponse,
    useEventCardToDealDamageResponse
} = Actions;

export const eventCardsListeners: ListenersContainer = {
    async choosePlayerToStealCardRequest({options}, {game}) {
        const allPlayers = game.getAllPlayers();
        const players = options.map(id => {
            const player = allPlayers.find(p => p.id === id);

            return player ? player.name : id;
        });

        const index = await game.controlsScene.chooseFromList("Выберите игрока для кражи карт", players.map(v => v.toString()))
        return choosePlayerToStealCardResponse(options[index]);
    },

    async chooseCardToStealRequest({cards}, {game}) {
        const index = (await game.controlsScene.chooseCards(cards, 1, "Выберите карту для кражи"))[0];

        return chooseCardToStealResponse(index);
    },

    async chooseCardsToDiscardAndTakeAnotherRequest({}, {game}) {
        const indexes = await game.controlsScene.chooseCards(game.currentPlayer.hand, 2, "Выберите до 2-х карт");

        return chooseCardsToDiscardAndTakeAnotherResponse(indexes);
    },

    async chooseModuleToMoveDamageRequest({reason}, {game}) {
        const {from, to} = await game.controlsScene.chooseModulesToMoveDamage(reason);
        return chooseModuleToMoveDamageResponse(from, to);
    },

    async chooseCardsForRepairSpaceshipRequest({}, {game}) {
        const indexes = await game.controlsScene.chooseCards(game.currentPlayer.hand, 2, "Выберите до 2-х карт");
        return chooseCardsForRepairSpaceshipResponse(indexes);
    },

    async chooseModulesToRepairByDiscardedCardsRequest({count}, {game}) {
        const positions = await game.controlsScene.chooseModulesToRepair(
            `выберите ${count} модулей для починки`,
            count
        );

        return chooseModulesToRepairByDiscardedCardsResponse(positions);
    },

    async chooseModuleToRepairByDiceRequest({amount}, {game}) {
        const positions = await game.controlsScene.chooseModulesToRepair(
            `выберите модуль для починки на ${amount}`,
            1
        );

        return chooseModuleToRepairByDiceResponse(positions[0]);
    },

    async chooseModuleToDamageByDiceRequest({damage}, {game}) {
        game.controlsScene.topBarDrawer.setStatus(`выберите модуль, чтобы нанести урон (${damage})`);

        const handle = game.spaceshipsScene.chooseModules(
            ({module, player}) => player !== game.getCurrentPlayer().id && !isMainModule(module),
            Boundary.noMoreThan(1),
            Color.fromHex('#a3b18a')
        );

        const validate = () => {
            (game.controlsScene.topBarDrawer.buttonsGroup.children[0] as Button).disabled(
                handle.get().length === 0
            );
        };

        handle.onSet(validate);

        const {playerId, modulePosition} = await new Promise<{
            playerId?: number,
            modulePosition?: Vector2
        }>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve({
                        playerId: handle.get()[0].player,
                        modulePosition: Vector2.modulePosition(handle.get()[0].module)
                    });
                }
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve({});
                }
            }]);

            validate();
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseModuleToDamageByDiceResponse(playerId, modulePosition);
    },

    async chooseTwoSolarPanelsToDestroyRequest({}, {game}) {
        const solarPanelsCount = SpaceshipGetters.getModulesByType(
            game.getCurrentPlayer().spaceship,
            ModuleType.SolarPanel
        ).length;
        const count = Math.min(solarPanelsCount, 2);

        game.controlsScene.topBarDrawer.setStatus(`уничтожьте солнечные батареи: ${count}`);

        const handle = game.spaceshipsScene.chooseModules(
            ({module, player}) => player === game.getCurrentPlayer().id && module.type === ModuleType.SolarPanel,
            Boundary.equal(count),
            Color.fromHex('#a3b18a')
        );

        const validate = () => {
            game.controlsScene.topBarDrawer.setButtonsDisabled(
                handle.get().length !== count
            );
        };

        handle.onSet(validate);

        const positions = await new Promise<Vector2[]>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Уничтожить",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve(handle.get().map(i => Vector2.modulePosition(i.module)));
                }
            }]);

            validate();
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseTwoSolarPanelsToDestroyResponse(positions);
    },

    async chooseModuleToDestroyRequest({}, {game}) {
        game.controlsScene.topBarDrawer.setStatus(`уничтожьте модуль`);

        const handle = game.spaceshipsScene.chooseModules(
            ({module, player}) => player === game.currentPlayer.id && !isMainModule(module),
            Boundary.equal(1),
            Color.fromHex('#a3b18a')
        );

        const validate = () => {
            game.controlsScene.topBarDrawer.setButtonsDisabled(
                handle.get().length !== 1
            );
        };

        handle.onSet(validate);

        const position = await new Promise<Vector2>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Уничтожить",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve(Vector2.modulePosition(handle.get()[0].module));
                }
            }]);

            validate();
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseModuleToDestroyResponse(position);
    },

    async permuteTopThreeEventCardsRequest({cards}, {game}) {
        game.controlsScene.topBarDrawer.setStatus("переставьте карточки");

        const order = await game.controlsScene.permuteCards(cards);
        game.controlsScene.topBarDrawer.clearStatus();

        return permuteTopThreeEventCardsResponse(order);
    },

    async useEventCardToDealDamageRequest({}, {game}) {
        game.controlsScene.topBarDrawer.setStatus("нанести урон карточкой действия с руки?")

        const result = await game.controlsScene.askYesOrNo();
        return useEventCardToDealDamageResponse(result);
    },

    async chooseModuleToDamageByEventCardRequest({victim}, {game}) {
        game.controlsScene.topBarDrawer.removeButtons();
        game.spaceshipsScene.endChoosingModule();

        game.controlsScene.topBarDrawer.setStatus(`выберите модуль, чтобы нанести 1 урон`);

        const handle = game.spaceshipsScene.chooseModules(
            ({module, player}) => player === victim && !isMainModule(module),
            Boundary.equal(1),
            COLORS.DANGER_STROKE
        );

        const validate = () => {
            game.controlsScene.topBarDrawer.setButtonsDisabled(
                handle.get().length !== 1
            );
        };

        handle.onSet(validate);

        const position = await new Promise<Vector2>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve(Vector2.modulePosition(handle.get()[0].module));
                }
            }]);

            validate();
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseModuleToDamageByEventCardResponse(position);
    }
}