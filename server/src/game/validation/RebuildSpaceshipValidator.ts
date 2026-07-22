import * as assert from "node:assert";

import * as z from "zod";

import {StateGetters} from "@common/getters/State";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {GameState, ModuleCard} from "@common/Types";

import {vector2Schema} from "./Helpers";

function getCurrentPlayerModules(state: GameState): ModuleCard[] {
    const currentPlayer = StateGetters.currentPlayer(state);

    const modulesInHand = currentPlayer.hand
        .filter(card => card.cardType === "module")
        .map(card => card.module);

    return [...currentPlayer.spaceship.modules, ...modulesInHand];
}

export const rebuildSpaceshipValidator = (state: GameState) =>
    z.array(
        z.object({
            id: z.int(),
            position: vector2Schema,
            rotation: z.int().min(0).max(3)
        }),
        {error: "Ожидался массив с информацией о положениях модулей"}
    )
        .refine(
            modules => new Set(modules.map(m => m.id)).size === modules.length,
            {error: "Все модули должны быть различными"}
        )
        .refine(modules => {
                const playerModules = getCurrentPlayerModules(state)
                    .map(module => module.id);

                return !modules.some(m => !playerModules.includes(m.id));
            },
            {error: "В корабле присутствует модуль, которого нет у игрока"}
        )
        .refine(modules => {
                const playerModules = getCurrentPlayerModules(state);

                const spaceship = modules.map(m => {
                    const playerModule = playerModules.find(c => c.id === m.id);
                    assert.ok(playerModule);

                    playerModule.x = m.position.x;
                    playerModule.y = m.position.y;
                    playerModule.rotation = m.rotation;

                    return playerModule;
                });

                return SpaceshipGetters.checkConfiguration({modules: spaceship});
            },
            {error: "Неправильная конфигурация корабля"});