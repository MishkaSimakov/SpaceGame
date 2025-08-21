// ===== Base schemas without state =====

import GameState from "../InitGameState";
import * as z from "zod";
import Vector2 from "@common/Vector2";
import {StateGetters} from "@common/getters/State";

export const vector2Schema = z.object(
    {
        x: z.number({message: "Координата X должна быть числом"}).int({message: "Координата X должна быть целым числом"}),
        y: z.number({message: "Координата Y должна быть числом"}).int({message: "Координата Y должна быть целым числом"}),
    },
    {message: "Неправильный объект передан в качестве координат"}
).transform(({x, y}) => new Vector2(x, y));

export const vector2ArraySchema = z.array(vector2Schema, {message: "Ожидался массив координат"});

export const numberArraySchema = z.array(
    z.number({message: "Должно быть числом"}).int({message: "Должно быть целым числом"}),
    {message: "Ожидался массив чисел"}
);

export const booleanSchema = z.boolean({message: "Ожидалось логическое значение"});

// Helper to build playerId schema bound to state
export const makeActivePlayerIdSchema = (state: GameState) =>
    z.number({message: "Неверный ID игрока"})
        .int({message: "ID игрока должен быть целым числом"})
        .refine(id => StateGetters.playerById(state, id) !== undefined, {message: "Игрок с таким ID не найден"})
        .refine(id => !StateGetters.playerById(state, id)!.lose, {message: "Выбранный игрок уже проиграл"});
