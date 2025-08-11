import * as z from "zod";
import Actions from "@common/actions/Main";
import GameState from "../GameState";
import {PlayerId} from "@common/Player";

// ===== Base schemas without state =====

const vector2Schema = z.object(
    {
        x: z.number({message: "Координата X должна быть числом"}).int({message: "Координата X должна быть целым числом"}),
        y: z.number({message: "Координата Y должна быть числом"}).int({message: "Координата Y должна быть целым числом"}),
    },
    {message: "Неправильный объект передан в качестве координат"}
);

const optionalVector2Schema = vector2Schema.optional().nullable();

const vector2ArraySchema = z.array(vector2Schema, {message: "Ожидался массив координат"});

const numberArraySchema = z.array(
    z.number({message: "Должно быть числом"}).int({message: "Должно быть целым числом"}),
    {message: "Ожидался массив чисел"}
);

const booleanSchema = z.boolean({message: "Ожидалось логическое значение"});

// Helper to build playerId schema bound to state
const makePlayerIdSchema = (state: GameState) =>
    z.number({message: "Неверный идентификатор игрока"})
        .int({message: "ID игрока должен быть целым числом"})
        .refine((id) => id >= 0, {message: "ID игрока должен быть положительным"})
        .refine((id) => state.players.some((p) => p.id === id), {message: "Игрок с таким ID не найден"});

type ResponseValidatorsContainer = {
    [Key in keyof typeof Actions as typeof Actions[Key] extends (...args: any[]) => { type: `${string}Response` }
        ? Key
        : never]: typeof Actions[Key] extends (...args: any[]) => { type: string; payload?: infer P }
        ? (state: GameState, payload: P) => void
        : never
};

// ===== All validators =====
export const validators: ResponseValidatorsContainer = {
    choosePlayerForAttackResponse: (state, payload) =>
        z.object({victim: makePlayerIdSchema(state)}).parse(payload),

    rebuildSpaceshipResponse: (state, payload) =>
        z.object({
            newSpaceship: z.any(),
            newHand: z.array(z.any(), {message: "Неверный формат руки"}),
        }).parse(payload),

    chooseCardTypeResponse: (state, payload) =>
        z.object({chosenType: z.enum(["event", "module"], {message: "Неверный тип карты"})}).parse(payload),

    showCardsToPlayersResponse: (state, payload) =>
        z.undefined().parse(payload),

    drawAdditionalModuleCardResponse: (state, payload) =>
        booleanSchema.parse(payload),

    drawAnotherEventCardResponse: (state, payload) =>
        booleanSchema.parse(payload),

    discardCardsResponse: (state, payload) =>
        numberArraySchema.parse(payload),

    chooseProtectorResponse: (state, payload) =>
        optionalVector2Schema.parse(payload),

    chooseWeaponAndTargetResponse: (state, payload) =>
        z.object({
            targetPosition: vector2Schema,
            weaponPosition: vector2Schema,
        }).parse(payload),

    useModuleSecondTimeResponse: (state, payload) =>
        booleanSchema.parse(payload),

    chooseTargetResponse: (state, payload) =>
        vector2Schema.parse(payload),

    chooseModuleToRepairResponse: (state, payload) =>
        optionalVector2Schema.parse(payload),

    // ===== EventCards.ts responses =====

    permuteTopThreeEventCardsResponse: (state, payload) =>
        numberArraySchema.parse(payload),

    chooseModuleToDestroyResponse: (state, payload) =>
        vector2Schema.parse(payload),

    chooseCardsForRepairSpaceshipResponse: (state, payload) =>
        numberArraySchema.parse(payload),

    chooseModulesToRepairByDiscardedCardsResponse: (state, payload) =>
        vector2ArraySchema.parse(payload),

    chooseTwoSolarPanelsToDestroyResponse: (state, payload) =>
        vector2ArraySchema.parse(payload),

    chooseModuleToRepairByDiceResponse: (state, payload) =>
        vector2Schema.parse(payload),

    chooseCardsToDiscardAndTakeAnotherResponse: (state, payload) =>
        numberArraySchema.parse(payload),

    chooseModuleToMoveDamageResponse: (state, payload) =>
        z.object({
            from: vector2Schema,
            to: vector2Schema,
        }).parse(payload),

    chooseModuleToDamageByDiceResponse: (state, payload) =>
        z.object({
            victimId: makePlayerIdSchema(state),
            victimModulePosition: vector2Schema,
        }).parse(payload),

    choosePlayerToStealCardResponse: (state, payload) =>
        makePlayerIdSchema(state).parse(payload),

    chooseCardToStealResponse: (state, payload) =>
        z.number({message: "Ожидался индекс карты"}).int({message: "Индекс карты должен быть целым числом"}).parse(payload),

    useEventCardToDealDamageResponse: (state, payload) =>
        booleanSchema.parse(payload),

    chooseModuleToDamageByEventCardResponse: (state, payload) =>
        vector2Schema.parse(payload),

    tryToRunawayResponse: (state, payload) =>
        booleanSchema.parse(payload),
};
