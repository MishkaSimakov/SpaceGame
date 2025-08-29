import fs from "fs";
import yaml from "js-yaml";
import * as jtd from "jtd";

import {basePath} from "@src/helpers/Paths";

function loadYaml(path: string): any {
    const text = fs.readFileSync(path, "utf8");
    return yaml.load(text);
}

function validateSchema(type: any, definitions: any, message: string) {
    const schema = {
        ...type,
        definitions
    };

    if (!jtd.isSchema(schema) || !jtd.isValidSchema(schema)) {
        throw new Error(message);
    }
}

type TypesData = jtd.Schema["definitions"];
type ActionsData = {
    name: string,
    description?: string,
    payload: {
        name: string,
        description?: string,
        type: jtd.Schema
    }[],
    meta: {
        name: string,
        description?: string,
        type: jtd.Schema
    }[]
}[];

export function loadData() {
    const actionsFilepath = basePath("server/src/data/Actions.yaml");
    const typesFilepath = basePath("server/src/data/Types.yaml");

    // Load schema and data
    const actionsData = loadYaml(actionsFilepath);
    const typesData = loadYaml(typesFilepath);

    validateSchema({}, typesData, `Invalid types schema in ${typesFilepath}`);

    for (const action of actionsData) {
        for (const argument of action.payload) {
            validateSchema(
                argument.type, typesData,
                `Invalid type schema for action payload (${action.name}:${argument.name}) in ${actionsFilepath}`
            );
        }

        for (const metaArgument of action.meta ?? []) {
            validateSchema(
                metaArgument.type, typesData,
                `Invalid type schema for action meta (${action.name}:${metaArgument.name}) in ${actionsFilepath}`
            );
        }
    }

    return {
        actions: actionsData as ActionsData,
        types: typesData as TypesData
    };
}