import * as z from "zod";

import * as Actions from "@common/Actions";
import {EventType, GameState, MainModuleType, ModuleType} from "@common/Types";

import {makeActivePlayerIdSchema} from "./Helpers";

type ValidatorType<T extends keyof typeof Actions> =
    (state: GameState) => z.ZodType<ReturnType<typeof Actions[T]>["payload"], any>;

type CheatsValidatorsContainer = {
    // TODO: remove optionality
    [Key in keyof typeof Actions as (Key extends `cheat${string}` ? Key : never)]?: ValidatorType<Key>
};

const connectorErrorMessage = "Тип коннектора должен быть числом из {0, 1, 2}";
const makeConnectorTypeValidator = () =>
    z.number({error: connectorErrorMessage})
        .min(0, {error: connectorErrorMessage})
        .max(3, {error: connectorErrorMessage});

const makeConnectorValidator = () =>
    z.object({
        top: makeConnectorTypeValidator(),
        right: makeConnectorTypeValidator(),
        bottom: makeConnectorTypeValidator(),
        left: makeConnectorTypeValidator(),
    }, {error: connectorErrorMessage});

export const validators: CheatsValidatorsContainer = {
    cheatChangeEnergy: (state: GameState) => z.object({
        target: makeActivePlayerIdSchema(state),
        delta: z.number()
    }),

    cheatPushModuleCardToHand: (state: GameState) => z.object({
        target: makeActivePlayerIdSchema(state),
        type: z.enum(ModuleType, {error: "Неверный тип модуля"}),
        connectors: makeConnectorValidator()
    }),
    cheatPushModuleCardToStack: (state: GameState) => z.object({
        type: z.enum(ModuleType, {error: "Неверный тип модуля"}),
        connectors: makeConnectorValidator()
    }),

    cheatPushEventCardToHand: (state: GameState) => z.object({
        target: makeActivePlayerIdSchema(state),
        type: z.enum(EventType, {error: "Неверный тип события"})
    }),
    cheatPushEventCardToStack: (state: GameState) => z.object({
        type: z.enum(EventType, {error: "Неверный тип события"})
    }),

    cheatSetMainModuleType: (state: GameState) => z.object({
        target: makeActivePlayerIdSchema(state),
        type: z.enum(MainModuleType, {error: "Неверный тип командного модуля"}),
        connectors: makeConnectorValidator()
    })
};