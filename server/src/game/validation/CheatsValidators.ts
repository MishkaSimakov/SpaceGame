import * as z from "zod";

import * as Actions from "@common/Actions";
import {GameState} from "@common/Types";

import {makeActivePlayerIdSchema} from "./Helpers";

type ValidatorType<T extends keyof typeof Actions> =
    (state: GameState) => z.ZodType<ReturnType<typeof Actions[T]>["payload"], any>;

type CheatsValidatorsContainer = {
    // TODO: remove optionality
    [Key in keyof typeof Actions as (Key extends `cheat${string}` ? Key : never)]?: ValidatorType<Key>
};

export const validators: CheatsValidatorsContainer = {
    cheatChangeEnergy: (state: GameState) => z.object({
        target: makeActivePlayerIdSchema(state),
        delta: z.number()
    }),

};