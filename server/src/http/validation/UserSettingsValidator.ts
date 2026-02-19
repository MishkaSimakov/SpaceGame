import {z} from "zod";
import {createCheckboxValidator, createColorValidator} from "@src/http/validation/common";

export const createUserSettingsValidator = () =>
    z.object({
        blueConnectorColor: createColorValidator(),
        redConnectorColor: createColorValidator(),

        fixedModulesGrid: createCheckboxValidator()
    });
