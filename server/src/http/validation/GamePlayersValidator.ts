import {z} from "zod";
import {User} from "../../database/entity/user";

export const gamePlayersValidator = (users: User[]) =>
    z.array(
        z.transform(val => {
            if (typeof val === 'string') return parseInt(val);
            if (typeof val === 'number') return val;
            return NaN;
        })
            .pipe(
                z.number().int()
                    .refine(id => users.find(u => u.id === id) !== undefined,
                        {error: "Игрок по данному id не найден."})
            )
    )
        .min(2, {error: "В игре должно быть хотя бы 2 игрока"})
        .max(5, {error: "В игре должно быть не больше 5 игроков"});