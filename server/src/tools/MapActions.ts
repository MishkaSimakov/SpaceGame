import fs from "fs";
import yaml from "js-yaml";
import {basePath} from "../helpers/Paths";
import * as jtd from "jtd";
import Handlebars from 'handlebars';
import {generateArgument} from "./typescript/GenerateArgumentType";
import {generateDefinitions} from "./typescript/GenerateDefinitionsType";
import {Definition} from "./typescript/AST";

function loadYaml(path: string): any {
    const text = fs.readFileSync(path, "utf8");
    return yaml.load(text);
}

type Action = {
    name: string;
    description?: string;
    payload: {
        name: string,
        typedName: string
    }[],
    meta: {
        name: string,
        typedName: string
    }[]
};

async function main() {
    // Load schema and data
    const actionsData = loadYaml(basePath("server/src/data/Actions.yaml"));
    const typesData = loadYaml(basePath("server/src/data/Types.yaml"));

    const schema = {
        definitions: typesData
    };
    if (!jtd.isSchema(schema) || !jtd.isValidSchema(schema)) {
        throw new Error(`Invalid types schema.`);
    }

    const typescriptDefinitions: Record<string, Definition<any>> = generateDefinitions(typesData);

    const actions: Action[] = [];

    for (const action of actionsData) {
        const parsedAction: Action = {
            name: action.name,
            description: action.description,
            payload: [],
            meta: []
        };

        for (const argument of action.payload) {
            const typeSchema = {
                ...argument.type,
                definitions: typesData
            };

            if (!jtd.isSchema(typeSchema) || !jtd.isValidSchema(typeSchema)) {
                throw new Error(`${action.name}:${argument.name} - invalid type schema`);
            }

            parsedAction.payload.push({
                name: argument.name,
                typedName: generateArgument(argument.name, typeSchema, typescriptDefinitions)
            });
        }

        for (const metaArgument of action.meta ?? []) {
            const typeSchema = {
                ...metaArgument.type,
                definitions: typesData
            };

            if (!jtd.isSchema(typeSchema) || !jtd.isValidSchema(typeSchema)) {
                throw new Error(`${action.name}:${metaArgument.name} - invalid type schema`);
            }

            parsedAction.meta.push({
                name: metaArgument.name,
                typedName: generateArgument(metaArgument.name, typeSchema, typescriptDefinitions)
            });
        }

        actions.push(parsedAction);
    }

    // template rendering
    Handlebars.registerHelper('renderArguments', function (payload: Action["payload"], meta: Action["meta"]) {
        const args = payload.concat(meta);

        return args
            .map(arg => arg.typedName)
            .join(', ');
    });

    Handlebars.registerHelper('renderPayload', function (args: Action["payload"]) {
        return args
            .map(arg => arg.name)
            .join(', ');
    });

    Handlebars.registerHelper('renderDefinitions', function (args: Record<string, Definition<any>>) {
        return Object.values(args).map(def => def.emit()).join('\n\n');
    });

    {
        const templateFile = fs.readFileSync(basePath("server/src/tools/templates/Actions.ts.handlebars"));
        const template = Handlebars.compile(templateFile.toString());

        const actionsFileResult = template({actions});
        fs.writeFileSync(basePath('common/Actions.ts'), actionsFileResult);
    }

    {
        const templateFile = fs.readFileSync(basePath("server/src/tools/templates/Types.ts.handlebars"));
        const template = Handlebars.compile(templateFile.toString());

        const typesFileResult = template({
            definitions: typescriptDefinitions
        });
        fs.writeFileSync(basePath('common/Types.ts'), typesFileResult);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
