import fs from "fs";
import Handlebars from "handlebars";

import {basePath} from "@src/helpers/Paths";
import {Definition} from "@src/tools/codegen/typescript/AST";
import {generateDefinitions} from "@src/tools/codegen/typescript/GenerateDefinitionsType";
import {generateArgument} from "@src/tools/codegen/typescript/GenerateArgumentType";
import {loadData} from "@src/tools/codegen/common/LoadData";
import {codegenPath} from "@src/tools/codegen/common/Path";

type Action = {
    name: string;
    description?: string;
    payload: {
        name: string,
        typedName: string,
        description?: string
    }[],
    meta: {
        name: string,
        typedName: string,
        description?: string
    }[]
};

function renderTypescriptTemplate(name: string, data: any) {
    const templateFile = fs.readFileSync(
        codegenPath(`typescript/templates/${name}.ts.handlebars`)
    );
    const template = Handlebars.compile(templateFile.toString());

    fs.writeFileSync(
        basePath(`common/${name}.ts`),
        template(data)
    );
}

function registerHandlebarsHelpers() {
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

    Handlebars.registerHelper('formatForDocstring', function (description: string) {
        return description?.split('\n')
            .filter(part => part.length > 0)
            .join('\n * ');
    });
}

export async function typescript() {
    const {actions, types} = loadData();

    const typescriptDefinitions: Record<string, Definition<any>> = generateDefinitions(types);

    const parsedActions = actions.map<Action>(action => {
        const parsedAction: Action = {
            name: action.name,
            description: action.description,
            payload: [],
            meta: []
        };

        for (const argument of action.payload) {
            parsedAction.payload.push({
                name: argument.name,
                typedName: generateArgument(argument.name, {
                    ...argument.type,
                    definitions: types
                }, typescriptDefinitions),
                description: argument.description
            });
        }

        for (const metaArgument of action.meta ?? []) {
            parsedAction.meta.push({
                name: metaArgument.name,
                typedName: generateArgument(metaArgument.name, {
                    ...metaArgument.type,
                    definitions: types
                }, typescriptDefinitions),
                description: metaArgument.description
            });
        }

        return parsedAction;
    });

    // template rendering
    registerHandlebarsHelpers();

    renderTypescriptTemplate("Actions", {actions: parsedActions});
    renderTypescriptTemplate("Types", {definitions: typescriptDefinitions});
}