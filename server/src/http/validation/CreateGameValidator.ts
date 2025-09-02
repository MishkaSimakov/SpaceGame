import {z} from "zod";

import {IUser} from "@src/game/interfaces/IUser";

export const gamePlayersValidator = (users: IUser[]) =>
    z.array(
        z.coerce.number().int()
            .refine(id => users.find(u => u.id === id) !== undefined,
                {error: "Игрок по данному id не найден."})
    )
        .min(2, {error: "В игре должно быть хотя бы 2 игрока"})
        .max(5, {error: "В игре должно быть не больше 5 игроков"});

const checkbox = z
    .any()
    .refine(val => val === undefined || val === 'on')
    .transform<boolean>(val => val === 'on');

export const createGameValidator = (users: IUser[]) =>
    z.object({
        name: z.string(),
        players: gamePlayersValidator(users),

        isPublic: checkbox,
        isDebug: checkbox,
        withTimeControl: checkbox,

        loseWhenTimeout: checkbox.optional(),
        startTime: z.coerce.number().nonnegative().optional(),
        defaultTimeIncrease: z.coerce.number().nonnegative().optional(),
        fightTimeIncrease: z.coerce.number().nonnegative().optional(),
    })
        .refine(input => {
            return !input.withTimeControl
                || input.loseWhenTimeout && input.startTime && input.defaultTimeIncrease && input.fightTimeIncrease
        });