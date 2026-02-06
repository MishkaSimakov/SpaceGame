import {
    chooseCardsForRepairSpaceshipResponse,
    chooseCardsToDiscardAndTakeAnotherResponse,
    chooseCardToStealResponse,
    chooseModulesToRepairByDiscardedCardsResponse,
    chooseModuleToDamageByDiceResponse, chooseModuleToDamageByEventCardResponse,
    chooseModuleToDestroyResponse,
    chooseModuleToMoveDamageResponse,
    chooseModuleToRepairByDiceResponse,
    choosePlayerToStealCardResponse,
    chooseSolarPanelsToDestroyResponse,
    permuteTopThreeEventCardsResponse,
    useEventCardToDealDamageResponse
} from "@common/Actions";
import {ModuleGetters} from "@common/getters/Module";
import {ModuleType, PlayerId, Vector2} from "@common/Types";

import {ListenersContainer} from "./ListenersContainer";
import Color from "../../graphics/Color";
import {COLORS} from "../../graphics/constants";
import {Boundary} from "../../graphics/CountBoundary";
import {ChooseModulesToMoveDamage} from "../../graphics/activities/ChooseModulesToMoveDamage";
import {ChooseCardsActivity} from "../../graphics/activities/ChooseCards";

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
        const indexes = await game.controlsScene.enqueueActivity(
            new ChooseCardsActivity(
                game.controlsScene,
                "Выберите карту для кражи",
                Boundary.equal(1),
                cards
            )
        );
        return chooseCardToStealResponse(indexes[0]);
    },

    async chooseCardsToDiscardAndTakeAnotherRequest({}, {game}) {
        const indexes = await game.controlsScene.enqueueActivity(
            new ChooseCardsActivity(
                game.controlsScene,
                "Выберите до 2-х карт",
                Boundary.noMoreThan(2),
                game.currentPlayer.hand
            )
        );
        return chooseCardsToDiscardAndTakeAnotherResponse(indexes);
    },

    async chooseModuleToMoveDamageRequest({reason}, {game}) {
        const move = await game.controlsScene.enqueueActivity(
            new ChooseModulesToMoveDamage(game.controlsScene, game.spaceshipsScene, reason)
        );
        return chooseModuleToMoveDamageResponse(move);
    },

    async chooseCardsForRepairSpaceshipRequest({}, {game}) {
        const indexes = await game.controlsScene.enqueueActivity(
            new ChooseCardsActivity(
                game.controlsScene,
                "Выберите до 2-х карт",
                Boundary.noMoreThan(2),
                game.currentPlayer.hand
            )
        );
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
            ({module, player}) => player !== game.getCurrentPlayer().id && !ModuleGetters.isMain(module),
            Boundary.noMoreThan(1),
            Color.fromHex('#a3b18a')
        );

        const validate = () => {
            game.controlsScene.topBarDrawer.setButtonDisabled('attack', handle.get().length === 0);
        };

        handle.subscribe(validate);

        const result = await new Promise<{
            victimId: PlayerId,
            victimModulePosition: Vector2
        } | undefined>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve({
                        victimId: handle.get()[0].player,
                        victimModulePosition: ModuleGetters.position(handle.get()[0].module)
                    });
                },
                name: 'attack'
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve(undefined);
                }
            }]);

            validate();
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseModuleToDamageByDiceResponse(result);
    },

    async chooseSolarPanelsToDestroyRequest({count}, {game}) {
        game.controlsScene.topBarDrawer.setStatus(`уничтожьте солнечные батареи: ${count}`);

        const handle = game.spaceshipsScene.chooseModules(
            ({module, player}) => player === game.getCurrentPlayer().id && module.type === ModuleType.SolarPanel,
            Boundary.equal(count),
            Color.fromHex('#a3b18a')
        );

        const validate = () => {
            game.controlsScene.topBarDrawer.setAllButtonsDisabled(
                handle.get().length !== count
            );
        };

        handle.subscribe(validate);

        const positions = await new Promise<Vector2[]>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Уничтожить",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve(handle.get().map(i => ModuleGetters.position(i.module)));
                }
            }]);

            validate();
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseSolarPanelsToDestroyResponse(positions);
    },

    async chooseModuleToDestroyRequest({}, {game}) {
        game.controlsScene.topBarDrawer.setStatus(`уничтожьте модуль`);

        const handle = game.spaceshipsScene.chooseModules(
            ({module, player}) => player === game.currentPlayer.id && !ModuleGetters.isMain(module),
            Boundary.equal(1),
            Color.fromHex('#a3b18a')
        );

        const validate = () => {
            game.controlsScene.topBarDrawer.setAllButtonsDisabled(
                handle.get().length !== 1
            );
        };

        handle.subscribe(validate);

        const position = await new Promise<Vector2>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Уничтожить",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve(ModuleGetters.position(handle.get()[0].module));
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

        const order = await game.controlsScene.permuteCards(cards.map(event => ({cardType: "event", event})));
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
            ({module, player}) => player === victim && !ModuleGetters.isMain(module),
            Boundary.equal(1),
            COLORS.DANGER_STROKE
        );

        const validate = () => {
            game.controlsScene.topBarDrawer.setAllButtonsDisabled(
                handle.get().length !== 1
            );
        };

        handle.subscribe(validate);

        const position = await new Promise<Vector2>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve(ModuleGetters.position(handle.get()[0].module));
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