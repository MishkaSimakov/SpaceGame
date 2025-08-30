import fs from "fs";
import Handlebars from "handlebars";

import {basePath} from "@src/helpers/Paths";
import {loadData} from "@src/tools/codegen/common/LoadData";
import {codegenPath} from "@src/tools/codegen/common/Path";
import {Assign, ASTNode} from "@src/tools/codegen/python/AST";
import {generateArgument, generateDefinition} from "@src/tools/codegen/python/GenerateType";
import {capitalize} from "@src/helpers/Str";

type Action = {
    name: string;
    description?: string;
    payload: {
        name: string,
        typedName: string,
        description?: string
    }[]
};

function getResponseType(requestType: string) {
    return requestType.replace('Request', 'Response');
}

function renderPythonTemplate(name: string, data: any) {
    const templateFile = fs.readFileSync(
        codegenPath(`python/templates/${name}.py.handlebars`)
    );
    const template = Handlebars.compile(templateFile.toString());

    fs.writeFileSync(
        basePath(`common/python/${name}.py`),
        template(data)
    );
}

function generateDocstring(info: { type: "argument", name: string } | { type: "description" }, description?: string) {
    let result = info.type === "argument" ? `    :param ${info.name}: ` : `    `;
    if (!description) {
        return result;
    }

    const indent = " ".repeat(result.length);
    const lines = description.split('\n').filter(part => part.length > 0);
    result += lines.join("\n" + indent);

    return result;
}

function registerHandlebarsHelpers() {
    Handlebars.registerHelper('capitalize', capitalize);

    Handlebars.registerHelper('getResponseType', getResponseType);

    Handlebars.registerHelper('renderArguments', function (payload: Action["payload"]) {
        return payload
            .map(arg => arg.typedName)
            .join(', ');
    });

    Handlebars.registerHelper('renderPayload', function (args: Action["payload"]) {
        return args
            .map(arg => arg.name)
            .join(', ');
    });

    Handlebars.registerHelper('renderDefinitions', function (args: Record<string, ASTNode>) {
        let result = "";

        const values = Object.values(args);
        for (let i = 0; i < values.length; ++i) {
            let separator: string;
            if (i + 1 === values.length) {
                separator = "";
            } else if (values[i] instanceof Assign && values[i + 1] instanceof Assign) {
                separator = "\n\n";
            } else {
                separator = "\n\n\n";
            }

            result += values[i].emit() + separator;
        }

        return result;
    });

    Handlebars.registerHelper("argumentDocstring", function (name: string, description?: string) {
        return generateDocstring({type: "argument", name}, description);
    });

    Handlebars.registerHelper("descriptionDocstring", function (description: string) {
        return generateDocstring({type: "description"}, description);
    });
}

export async function python() {
    const {actions, types} = loadData();

    const pythonDefinitions: Record<string, ASTNode> = {};

    for (const [name, schema] of Object.entries(types)) {
        generateDefinition(name, {
            ...schema,
            definitions: types
        }, pythonDefinitions);
    }

    const parsedActions = actions
        .map<Action>(action => {
            const parsedAction: Action = {
                name: action.name,
                description: action.description,
                payload: [],
            };

            for (const argument of action.payload) {
                parsedAction.payload.push({
                    name: argument.name,
                    typedName: generateArgument(
                        [action.name, argument.name],
                        argument.name,
                        {...argument.type, definitions: types},
                        pythonDefinitions
                    ).emit(),
                    description: argument.description
                });
            }

            return parsedAction;
        });

    const requests = parsedActions.filter(action => action.name.endsWith('Request'));

    // template rendering
    registerHandlebarsHelpers();

    renderPythonTemplate("actions", {
        actions: requests.flatMap(request => [
            request,
            parsedActions.find(action => action.name === getResponseType(request.name))
        ])
    });
    renderPythonTemplate("base_client", {requests});
    renderPythonTemplate("types", {definitions: pythonDefinitions});
}