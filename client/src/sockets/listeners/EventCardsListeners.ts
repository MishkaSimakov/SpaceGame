import {ListenersContainer} from "./ListenersContainer";
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
    chooseTwoSolarPanelsToDestroyResponse,
    permuteTopThreeEventCardsResponse,
    useEventCardToDealDamageResponse
} from "@common/actions/Main";
import Module, {isModule, ModuleType} from "@common/modules/Module";
import {MoveDamageReason} from "@common/Types";
import Color from "../../graphics/Color";
import {COLORS} from "../../graphics/constants";
import Vector2 from "@common/Vector2";
import {Button} from "../../graphics/shapes/Button";
import {SpaceshipGetters} from "@common/getters/Spaceship";

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

        let modules: Module[] = [];

        game.spaceshipsScene.chooseModules((chosen: Module[]) => {
            modules = chosen;
        }, (module?: Module, playerId?: number) => {
            if (playerId !== game.currentPlayer.id)
                return false;

            if (module.health !== module.totalHealth)
                return false;

            return true;
        }, count, Color.fromHex('#a3b18a'));

        const positions = await new Promise<Vector2[]>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Починить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve(modules.map((m) => new Vector2(m.x, m.y)));
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

        let module: Module;

        game.spaceshipsScene.chooseModule((chosen: Module) => {
            module = chosen;
        }, (module?: Module, playerId?: number) => {
            if (playerId !== game.currentPlayer.id)
                return false;

            if (module.health !== module.totalHealth)
                return false;

            return true;
        }, false, Color.fromHex('#a3b18a'));

        const position = await new Promise<Vector2 | undefined>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Починить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    const position = module
                        ? new Vector2(module.x, module.y)
                        : undefined;

                    resolve(position);
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

        let module: Module;
        let id: number;

        game.spaceshipsScene.chooseModule((chosen: Module, playerId: number) => {
            module = chosen;
            id = playerId;

            (game.controlsScene.topBarDrawer.buttonsGroup.children[0] as Button).disabled(module === undefined);
        }, (module?: Module, playerId?: number) => {
            if (playerId === game.currentPlayer.id)
                return false;

            if (module.isMain)
                return false;

            return true;
        }, false, Color.fromHex('#a3b18a'));

        const {playerId, modulePosition} = await new Promise<{
            playerId?: number,
            modulePosition?: Vector2
        }>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (module) {
                        resolve({
                            playerId: id,
                            modulePosition: new Vector2(module.x, module.y)
                        });
                    } else {
                        resolve(undefined);
                    }
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

        let selectedSolarPanels: Module[] = [];

        game.spaceshipsScene.chooseModules((chosen: Module[]) => {
            selectedSolarPanels = chosen;

            game.controlsScene.topBarDrawer.setButtonsDisabled(selectedSolarPanels.length < count);
        }, (module?: Module, playerId?: number) => {
            if (playerId !== game.currentPlayer.id)
                return false;

            if (module.type !== ModuleType.SolarPanel)
                return false;

            return true;
        }, count, Color.fromHex('#a3b18a'));

        game.controlsScene.topBarDrawer.setButtonsDisabled(true);

        const positions = await new Promise<Vector2[]>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Уничтожить",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (selectedSolarPanels.length < count) return;

                    resolve(selectedSolarPanels.map(m => new Vector2(m.x, m.y)));
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

        let selectedModule: Module;

        game.spaceshipsScene.chooseModule((chosen: Module) => {
            selectedModule = chosen;

            game.controlsScene.topBarDrawer.setButtonsDisabled(selectedModule === undefined);
        }, (module?: Module, playerId?: number) => {
            if (playerId !== game.currentPlayer.id)
                return false;

            if (module.isMain)
                return false;

            return true;
        }, true, Color.fromHex('#a3b18a'));

        game.controlsScene.topBarDrawer.setButtonsDisabled(true);

        const position = await new Promise<Vector2>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Уничтожить",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (!selectedModule) return;

                    resolve(new Vector2(selectedModule.x, selectedModule.y));
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

        let selectedModule: Module;

        game.spaceshipsScene.chooseModule((chosen: Module) => {
            selectedModule = chosen;

            game.controlsScene.topBarDrawer.setButtonsDisabled(selectedModule === undefined);
        }, (module?: Module, playerId?: number) => {
            if (playerId !== victim)
                return false;

            if (module.isMain)
                return false;

            return true;
        }, true, COLORS.DANGER_STROKE);

        game.controlsScene.topBarDrawer.setButtonsDisabled(true);

        const position = await new Promise<Vector2>((resolve) => {
            game.controlsScene.topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (!selectedModule) return;

                    resolve(new Vector2(selectedModule.x, selectedModule.y));
                }
            }]);
        });

        game.controlsScene.topBarDrawer.removeButtons();
        game.controlsScene.topBarDrawer.clearStatus();
        game.spaceshipsScene.endChoosingModule();

        return chooseModuleToDamageByEventCardResponse(position);
    }
}