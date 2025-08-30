import * as z from "zod";

import {StateGetters} from "@common/getters/State";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import * as Actions from "@common/Actions";
import {CardType, GameState, ModuleType} from "@common/Types";
import {ModuleGetters} from "@common/getters/Module";

import {booleanSchema, makeActivePlayerIdSchema, numberArraySchema, vector2ArraySchema, vector2Schema} from "./Helpers";
import {rebuildSpaceshipValidator} from "./RebuildSpaceshipValidator";

type ValidatorType<Res extends keyof typeof Actions, Req> =
    Req extends keyof typeof Actions
        ? (state: GameState, request: ReturnType<typeof Actions[Req]>)
            => z.ZodType<ReturnType<typeof Actions[Res]>["payload"], any>
        : never
type ResponseValidatorsContainer = {
    [Key in keyof typeof Actions as (Key extends `${string}Response` ? Key : never)]:
    Key extends `${infer BaseName}Response`
        ? ValidatorType<Key, `${BaseName}Request`>
        : never
};

// ===== All validators =====
export const validators: ResponseValidatorsContainer = {
    choosePlayerForAttackResponse: (state, request) => {
        const victimValidator = makeActivePlayerIdSchema(state).refine(
            id => id !== request.payload.player,
            {error: 'Нельзя атаковать самого себя'}
        );
        return z.object({
            victim: request.payload.required ? victimValidator : victimValidator.optional()
        });
    },
    rebuildSpaceshipResponse: (state, request) =>
        z.object({newSpaceship: rebuildSpaceshipValidator(state)}),

    chooseCardTypeResponse: () =>
        z.object({
            chosenType: z.enum(CardType, {error: "Неверный тип карты"})
        }),
    showCardsToPlayersResponse: () => z.object({}),
    drawAdditionalModuleCardResponse: () => z.object({
        draw: booleanSchema
    }),
    drawAnotherEventCardResponse: () => z.object({
        draw: booleanSchema
    }),
    discardCardsResponse: (state, request) => {
        const player = StateGetters.playerById(state, request.payload.player)!;
        const outsideRangeError = `Индекс карты выходит за допустимые границы (\\not\\in [0, ${player.hand.length - 1}])`
        const minDiscardedCards = player.hand.length - state.settings.maxCardsOnHand;

        return z.object({
            indexes: z
                .array(
                    z
                        .int({error: "Индексы карт должны быть целыми числами"})
                        .min(0, {error: outsideRangeError})
                        .max(player.hand.length - 1, {error: outsideRangeError}),
                    {error: "Ожидался массив чисел"}
                )
                .refine(
                    indexes => new Set(indexes).size === indexes.length,
                    {error: "Все индексы должны быть различными."}
                )
                .min(
                    minDiscardedCards,
                    {error: `Нужно скинуть хотя бы ${minDiscardedCards} карт.`}
                )
        });
    },
    chooseProtectorResponse: (state, request) =>
        z.object({
            position: vector2Schema.refine(
                position => {
                    const player = StateGetters.playerById(state, request.payload.player)!;
                    const module = SpaceshipGetters.getModuleByPosition(player.spaceship, position);
                    return module && ModuleGetters.isProtector(module);
                },
                {error: "Выбранный модуль должен быть протектором."}
            ).optional()
        }),

    chooseWeaponAndTargetResponse: (state, request) => {
        const victim = StateGetters.playerById(state, request.payload.victim)!;
        const attacker = StateGetters.playerById(state, request.payload.player)!;

        return z.object({
            targetPosition: vector2Schema
                .refine(
                    position => SpaceshipGetters.getModuleByPosition(victim.spaceship, position) !== undefined,
                    {error: "В поле `targetPosition` должна быть позиция модуля соперника."}
                ),
            weaponPosition: vector2Schema
                .refine(
                    position => {
                        const module = SpaceshipGetters.getModuleByPosition(attacker.spaceship, position);
                        return module && ModuleGetters.isWeapon(module);
                    },
                    {error: "В поле `weapon position` должна быть позиция оружия на вашем корабле."}
                )
                .refine(
                    position => {
                        const module = SpaceshipGetters.getModuleByPosition(attacker.spaceship, position)!;
                        return module.energyCost <= StateGetters.playerById(state, request.payload.player)!.energy;
                    },
                    {error: "Недостаточно энергии для выбранного оружия."}
                ),
        })
    },
    useModuleSecondTimeResponse: () =>
        z.object({
            use: booleanSchema
        }),
    chooseTargetResponse: (state, request) =>
        z.object({
            position: vector2Schema
                .refine(
                    position => SpaceshipGetters.getModuleByPosition(
                        StateGetters.playerById(state, request.payload.victim)!.spaceship, position
                    ) !== undefined,
                    {error: "Ожидалась позиция модуля соперника."}
                )
        }),
    chooseModuleToRepairResponse: (state, request) =>
        z.object({
            position: vector2Schema
                .refine(
                    position => SpaceshipGetters.getModuleByPosition(
                        StateGetters.playerById(state, request.payload.player)!.spaceship, position
                    ) !== undefined,
                    {error: "Ожидалась позиция модуля."}
                ).optional()
        }),

    // ===== EventCards.ts responses =====
    permuteTopThreeEventCardsResponse: () => {
        const areSetsEqual = <T>(a: Set<T>, b: Set<T>) =>
            a.size === b.size && [...a].every(value => b.has(value));
        return z.object({
            order: numberArraySchema.refine(
                indexes => areSetsEqual(new Set(indexes), new Set([0, 1, 2])),
                {error: "Индексы должны быть перестановкой [0, 1, 2]"}
            )
        });
    },
    chooseModuleToDestroyResponse: (state, request) =>
        z.object({
            position: vector2Schema
                .refine(
                    position => {
                        const player = StateGetters.playerById(state, request.payload.player)!;
                        const module = SpaceshipGetters.getModuleByPosition(player.spaceship, position);
                        return module && !ModuleGetters.isMain(module);
                    },
                    {error: "Ожидалась позиция модуля (за исключением командного модуля)."}
                )
        }),
    chooseCardsForRepairSpaceshipResponse: (state, request) => {
        const player = StateGetters.playerById(state, request.payload.player)!;
        const outsideRangeError = `Индекс карты выходит за допустимые границы (\\not\\in [0, ${player.hand.length - 1}])`
        return z.object({
            indexes: z.array(
                z
                    .int({error: "Индексы карт должны быть целыми числами"})
                    .min(0, {error: outsideRangeError})
                    .max(player.hand.length - 1, {error: outsideRangeError}),
                {error: "Ожидался массив чисел"}
            )
                .max(2, {error: `Можно выбрать не более 2-х карт.`})
        });
    },

    chooseModulesToRepairByDiscardedCardsResponse: (state, request) => {
        const player = StateGetters.playerById(state, request.payload.player)!;
        return z.object({
            positions: vector2ArraySchema
                .refine(
                    positions => new Set(positions.map(p => `${p.x}-${p.y}`)).size === positions.length,
                    {error: "Все позиции должны быть различными."}
                )
                .refine(
                    positions => positions.every(position => SpaceshipGetters.getModuleByPosition(player.spaceship, position) !== undefined),
                    {error: "Все позиции должны указывать на модули вашего корабля."}
                )
                .max(request.payload.count, {error: `Нужно выбрать не более ${request.payload.count} модуля/ей.`})
        });
    },

    chooseSolarPanelsToDestroyResponse: (state, request) => {
        const player = StateGetters.playerById(state, request.payload.player)!;
        return z.object({
            positions: vector2ArraySchema
                .refine(
                    positions => new Set(positions.map(p => `${p.x}-${p.y}`)).size === positions.length,
                    {error: "Все позиции должны быть различными."}
                )
                .refine(
                    positions => positions.every(position => {
                        const module = SpaceshipGetters.getModuleByPosition(player.spaceship, position);
                        return module && module.type === ModuleType.SolarPanel;
                    }),
                    {error: "Все позиции должны указывать на солнечные панели вашего корабля."}
                )
                .length(request.payload.count, {error: `Нужно выбрать ${request.payload.count} модуль/я.`})
        });
    },

    chooseModuleToRepairByDiceResponse: (state, request) => {
        const player = StateGetters.playerById(state, request.payload.player)!;

        return z.object({
            position: vector2Schema
                .refine(
                    position => SpaceshipGetters.getModuleByPosition(player.spaceship, position) !== undefined,
                    {error: "Позиция должна указывать на модуль вашего корабля."}
                )
                .optional()
        });

    },

    chooseCardsToDiscardAndTakeAnotherResponse: (state, request) => {
        const player = StateGetters.playerById(state, request.payload.player)!;

        return z.object({
            indexes: numberArraySchema
                .refine(
                    indexes => new Set(indexes).size === indexes.length,
                    {error: "Все индексы должны быть различными."}
                )
                .refine(
                    indexes => indexes.every(index => index >= 0 && index <= player.hand.length - 1),
                    {error: `Индекс карты выходит за допустимые границы (\\not\\in [0, ${player.hand.length - 1}])`}
                )
                .max(2, {error: "Можно скинуть не более 2 карт."})
        });
    },

    chooseModuleToMoveDamageResponse: (state, request) => {
        const player = StateGetters.playerById(state, request.payload.player)!;

        return z.object({
            move: z.object({
                source: vector2Schema,
                destination: vector2Schema,
            })
                .refine(
                    ({source, destination}) => !(source.x === destination.x && source.y === destination.y),
                    {error: "Позиции `source` и `destination` должны быть различными."}
                )
                .refine(
                    ({source, destination}) => {
                        const fromModule = SpaceshipGetters.getModuleByPosition(player.spaceship, source);
                        const toModule = SpaceshipGetters.getModuleByPosition(player.spaceship, destination);
                        return fromModule && toModule && fromModule.health !== fromModule.totalHealth;
                    },
                    {error: "Позиция `source` должна указывать на повреждённый модуль вашего корабля, `destination` - на любой другой модуль вашего корабля."}
                )
                .optional()
        });
    },

    chooseModuleToDamageByDiceResponse: (state, request) =>
        z.object({
            info: z
                .object({
                    victimId: makeActivePlayerIdSchema(state)
                        .refine(id => id !== request.payload.player, {error: "Нельзя выбрать самого себя."}),
                    victimModulePosition: vector2Schema,
                })
                .refine(
                    ({victimId, victimModulePosition}) => {
                        const victim = StateGetters.playerById(state, victimId)!;
                        const module = SpaceshipGetters.getModuleByPosition(victim.spaceship, victimModulePosition);
                        return module && !ModuleGetters.isMain(module);
                    },
                    {error: "Позиция должна указывать на модуль соперника (кроме командного)."}
                )
                .optional()
        }),

    choosePlayerToStealCardResponse: (state, request) =>
        z.object({
            target: makeActivePlayerIdSchema(state)
                .refine(id => id !== request.payload.player, {error: "Нельзя выбрать самого себя."})
                .refine(id => StateGetters.playerById(state, id)!.hand.length > 0, {error: "У выбранного игрока должны быть карты на руках."})
        }),

    chooseCardToStealResponse: (state, request) =>
        z.object({
            chosenCardIndex: z
                .int({message: "Индекс карты должен быть целым числом"})
                .refine(
                    index => {
                        return 0 <= index && index < request.payload.cards.length;
                    },
                    {message: "Индекс выходит за границы руки выбранного игрока."}
                )
        }),

    useEventCardToDealDamageResponse: () =>
        z.object({
            useEventCard: booleanSchema
        }),

    chooseModuleToDamageByEventCardResponse: (state, request) =>
        z.object({
            position: vector2Schema
                .refine(
                    position => {
                        const victim = StateGetters.playerById(state, request.payload.victim)!;
                        const module = SpaceshipGetters.getModuleByPosition(victim.spaceship, position);
                        return module && !ModuleGetters.isMain(module);
                    },
                    {error: "Позиция должна указывать на модуль соперника (кроме командного)."}
                )
        }),

    tryToRunawayResponse: () =>
        z.object({
            willRunaway: booleanSchema
        }),
};