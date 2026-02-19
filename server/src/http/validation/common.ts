import {z} from "zod";
import Color from "@common/helpers/Color";

export const createCheckboxValidator = () => z
    .any()
    .refine(val => val === undefined || val === 'on')
    .transform<boolean>(val => val === 'on');

export const createColorValidator = () => z
    .string()
    .refine(val => Color.fromString(val) !== undefined, {error: "В этом поле должен быть цвет."});