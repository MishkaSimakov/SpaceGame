import {ListenersContainer} from "./ListenersContainer";
import {
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
} from "@common/actions/Main";
import Module, {ModuleType} from "@common/modules/Module";
import Color from "../../graphics/Color";
import {COLORS} from "../../graphics/constants";
import Vector2 from "@common/Vector2";
import {Button} from "../../graphics/shapes/Button";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {Boundary} from "../../graphics/CountBoundary";

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
        game.controlsScene.topBarDrawer.setStatus("выберите модули для починки (" + count + ")");

        const handle = game.spaceshipsScene.chooseModules(
            ({module, player}) => player === game.getCurrentPlayer().id && module.health !== module.totalHealth,
            Boundary.equal(count),
            Color.fromHex('#a3b18a')
        );

        const positions = await new Promise<Vector2[]>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Починить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve(handle.get().map(m => new Vector2(m.module.x, m.module.y)));
                }
            }]);
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseModulesToRepairByDiscardedCardsResponse(positions);
    },

    async chooseModuleToRepairByDiceRequest({amount}, {game}) {
        game.controlsScene.topBarDrawer.setStatus(`выберите модуль для починки (${amount})`);

        const handle = game.spaceshipsScene.chooseModules(
            ({module, player}) => player === game.getCurrentPlayer().id && module.health !== module.totalHealth,
            Boundary.noMoreThan(1),
            Color.fromHex('#a3b18a')
        );

        // TODO: count validation
        const position = await new Promise<Vector2 | undefined>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Починить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    const module = handle.get()[0]?.module;
                    resolve(module ? new Vector2(module.x, module.y) : undefined);
                }
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve(undefined);
                }
            }]);
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseModuleToRepairByDiceResponse(position);
    },

    async chooseModuleToDamageByDiceRequest({damage}, {game}) {
        game.controlsScene.topBarDrawer.setStatus(`выберите модуль, чтобы нанести урон (${damage})`);

        //(chosen: Module, playerId: number) => {
        //             module = chosen;
        //             id = playerId;
        //
        //             (game.controlsScene.topBarDrawer.buttonsGroup.children[0] as Button).disabled(module === undefined);
        //         }

        const handle = game.spaceshipsScene.chooseModules(
            ({module, player}) => player !== game.getCurrentPlayer().id && !module.isMain,
            Boundary.noMoreThan(1),
            Color.fromHex('#a3b18a')
        );

        // TODO: validate count
        const {playerId, modulePosition} = await new Promise<{
            playerId?: number,
            modulePosition?: Vector2
        }>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    const info = handle.get()[0];

                    resolve({
                        playerId: info?.player,
                        modulePosition: info ? new Vector2(info.module.x, info.module.y) : undefined
                    });
                }
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve({});
                }
            }]);

            (game.controlsScene.topBarDrawer.buttonsGroup.children[0] as Button).disabled(true);
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

        // TODO: count validation
        const positions = await new Promise<Vector2[]>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Уничтожить",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve(handle.get().map(i => new Vector2(i.module.x, i.module.y)));
                }
            }]);
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseTwoSolarPanelsToDestroyResponse(positions);
    },

    async chooseModuleToDestroyRequest({}, {game}) {
        game.controlsScene.topBarDrawer.setStatus(`уничтожьте модуль`);

        const handle = game.spaceshipsScene.chooseModules(
            ({module, player}) => player === game.currentPlayer.id && !module.isMain,
            Boundary.equal(1),
            Color.fromHex('#a3b18a')
        );

        // TODO: count validation
        const position = await new Promise<Vector2>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Уничтожить",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve(new Vector2(handle.get()[0].module.x, handle.get()[0].module.y));
                }
            }]);
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
            ({module, player}) => player === victim && !module.isMain,
            Boundary.equal(1),
            COLORS.DANGER_STROKE
        );

        // TODO: count validation
        const position = await new Promise<Vector2>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    resolve(new Vector2(handle.get()[0].module.x, handle.get()[0].module.y));
                }
            }]);
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseModuleToDamageByEventCardResponse(position);
    }
}