import * as assert from "node:assert";

import {
    isDiscriminatorForm,
    isElementsForm,
    isEnumForm,
    isPropertiesForm,
    isRefForm,
    isTypeForm,
    isValuesForm,
    Schema
} from "jtd";

import {AnnAssign, Assign, ASTNode, ClassDef, Constant, Name, Union} from "@src/tools/codegen/python/AST";
import {arrayOf, dictOf, getEnum, literal, optional, wrapInDefinition} from "@src/tools/codegen/python/Components";
import {typeMapping} from "@src/tools/codegen/python/TypeMapping";
import {capitalize} from "@common/helpers/Str";

export function generateDefinition(name: string, schema: Schema, generatedDefinitions: Record<string, ASTNode>) {
    if (name in generatedDefinitions) {
        return generatedDefinitions[name];
    }

    const def = generateWithState(schema, {
        path: [name],
        rootSchema: schema,
        generatedDefinitions,
        info: {type: "definition", name: name}
    });

    generatedDefinitions[name] = def;

    return def;
}

export function generateArgument(path: string[], name: string, schema: Schema, generatedDefinitions: Record<string, ASTNode>) {
    const type = generateWithState(schema, {
        path,
        rootSchema: schema,
        generatedDefinitions,
        info: {type: "inline"}
    });

    return new AnnAssign(new Name(name), type);
}

function generateName(path: string[]): string {
    return path.map(capitalize).join('');
}

type GenerationState = {
    path: string[],
    rootSchema: Schema,
    generatedDefinitions: Record<string, ASTNode>,
    info: { type: "definition", name: string } | { type: "inline" }
};

function inlineState(state: GenerationState): GenerationState {
    return {
        ...state,
        info: {type: "inline"}
    };
}

function generateWithState(schema: Schema, state: GenerationState): ASTNode {
    const {path, rootSchema, generatedDefinitions, info} = state;

    if (path.length > 10) {
        throw new Error(`Reached depth limit. Path: ${path.join('/')}`);
    }

    if (isRefForm(schema)) {
        if (!(schema.ref in generatedDefinitions)) {
            assert.ok(rootSchema.definitions);
            generateDefinition(schema.ref, {
                ...rootSchema.definitions[schema.ref],
                definitions: rootSchema.definitions
            }, generatedDefinitions);
        }

        let result: ASTNode = new Name(schema.ref);
        if (schema.nullable) {
            result = optional(result);
        }

        return wrapInDefinition(info, result);
    } else if (isTypeForm(schema)) {
        let result: ASTNode = typeMapping[schema.type];
        if (schema.nullable) {
            result = optional(result);
        }

        return wrapInDefinition(info, result);
    } else if (isValuesForm(schema)) {
        path.push('values');
        const child = arrayOf(generateWithState(schema.values, inlineState(state)));
        path.pop();

        return wrapInDefinition(info, dictOf(child));
    } else if (isElementsForm(schema)) {
        path.push('elements');
        const child = generateWithState(schema.elements, inlineState(state));
        path.pop();

        return wrapInDefinition(info, arrayOf(child));
    } else if (isPropertiesForm(schema)) {
        if (info.type === "inline") {
            const name = generateName(path);
            generateDefinition(name, {
                ...schema,
                definitions: rootSchema.definitions
            }, generatedDefinitions);

            let result: ASTNode = new Name(name);
            if (schema.nullable) {
                result = optional(result);
            }

            return result;
        } else {
            const body: ASTNode[] = [];

            if (schema.properties) {
                for (const [name, property] of Object.entries(schema.properties)) {
                    path.push(name);
                    body.push(new AnnAssign(
                        new Name(name),
                        generateWithState(property, inlineState(state))
                    ));
                    path.pop();
                }
            }

            if (schema.optionalProperties) {
                for (const [name, property] of Object.entries(schema.optionalProperties)) {
                    path.push(name);
                    body.push(new Assign(
                        new AnnAssign(
                            new Name(name),
                            optional(generateWithState(property, inlineState(state)))
                        ),
                        Constant.none()
                    ));
                    path.pop();
                }
            }

            if (body.length === 0) {
                body.push(new Name("pass"));
            }

            return new ClassDef(info.name, body, [], [new Name("dataclass")]);
        }
    } else if (isEnumForm(schema)) {
        if (info.type === "inline") {
            const name = generateName(path);
            generateDefinition(name, {
                ...schema,
                definitions: rootSchema.definitions
            }, generatedDefinitions);
            return new Name(name);
        } else {
            return getEnum(info.name, schema.enum);
        }
    } else if (isDiscriminatorForm(schema)) {
        if (info.type === "inline") {
            const name = generateName(path);
            generateDefinition(name, {
                ...schema,
                definitions: rootSchema.definitions
            }, generatedDefinitions);
            return new Name(name);
        } else {
            const options: ClassDef[] = [];

            for (const [name, option] of Object.entries(schema.mapping)) {
                path.push(name);
                const optionType = generateDefinition(generateName(path), {
                    ...option,
                    definitions: rootSchema.definitions
                }, generatedDefinitions) as ClassDef;
                path.pop();

                optionType.body.push(new AnnAssign(
                    new Name(schema.discriminator),
                    literal(name)
                ));

                options.push(optionType);
            }

            return wrapInDefinition(info, new Union(options.map(option => new Name(option.name))));
        }
    } else {
        return wrapInDefinition(info, new Name("Any"));
    }
}