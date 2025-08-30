import fs from "fs";
import Handlebars from "handlebars";

import {basePath} from "@src/helpers/Paths";
import {loadData} from "@src/tools/codegen/common/LoadData";
import {codegenPath} from "@src/tools/codegen/common/Path";
import {Assign, ASTNode} from "@src/tools/codegen/python/AST";
import {generateArgument, generateDefinition} from "@src/tools/codegen/python/GenerateType";

type Action = {
    name: string;
    description?: string;
    payload: {
        name: string,
        typedName: string
    }[]
};

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

function registerHandlebarsHelpers() {
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

    const parsedActions = actions.map<Action>(action => {
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
                ).emit()
            });
        }

        return parsedAction;
    });

    // template rendering
    registerHandlebarsHelpers();

    // renderPythonTemplate("BaseClient", {});
    renderPythonTemplate("Types", {definitions: pythonDefinitions});
}