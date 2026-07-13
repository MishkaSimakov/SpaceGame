// This file generates typescript type description from "RFC 8927"-compliant YAML description
// Generated type is "inline". It means that it should be used in contexts like function definition:
// function test(a: number) {} // <- "number" here is an "inline" type

import {
    isDiscriminatorForm,
    isElementsForm,
    isEnumForm,
    isPropertiesForm,
    isRefForm,
    isTypeForm,
    isValuesForm,
    Schema,
} from "jtd";
import {ArrayType, Definition, ObjectType, Parameter, PrimitiveType, RecordType, Type} from "./AST";
import {typeMapping} from "./TypeMapping";

export function generateArgument(name: string, schema: Schema, definitions: Record<string, Definition<any>>): string {
    const type = generateArgumentTypeWithState(schema, {
        path: [],
        definitions
    });

    return new Parameter(name, type, !!schema.nullable).emit();
}

type GenerationState = {
    path: string[],
    definitions: Readonly<Record<string, Definition<any>>>
};

function generateArgumentTypeWithState(schema: Schema, state: GenerationState): Type {
    if (state.path.length > 10) {
        throw new Error(`Reached depth limit. Path: ${state.path.join('/')}`);
    }

    if (schema.nullable && state.path.length > 0) {
        throw new Error(`Nested nullable is not supported. Path: ${state.path.join('/')}`);
    }

    const formNotAllowedError = (form: "discriminator" | "enum") => {
        throw new Error(`${form} form is allowed only inside "definitions" section. Use "ref" form instead. Path: ${state.path.join('/')}`);
    };

    if (isRefForm(schema)) {
        const reference = state.definitions[schema.ref].getReference();
        reference.typeName = 'Types.' + reference.typeName;

        return reference;
    } else if (isTypeForm(schema)) {
        return typeMapping[schema.type];
    } else if (isValuesForm(schema)) {
        state.path.push('values');
        const result = new RecordType(generateArgumentTypeWithState(schema.values, state));
        state.path.pop();

        return result;
    } else if (isElementsForm(schema)) {
        state.path.push('elements');
        const result = new ArrayType(generateArgumentTypeWithState(schema.elements, state));
        state.path.pop();

        return result;
    } else if (isPropertiesForm(schema)) {
        state.path.push('properties');

        const properties: Record<string, { type: Type, nullable: boolean }> = {};

        if (schema.properties) {
            for (const [name, property] of Object.entries(schema.properties)) {
                state.path.push(name);
                properties[name] = {
                    type: generateArgumentTypeWithState(property, state),
                    nullable: false
                };
                state.path.pop();
            }
        }

        if (schema.optionalProperties) {
            for (const [name, property] of Object.entries(schema.optionalProperties)) {
                state.path.push(name);
                properties[name] = {
                    type: generateArgumentTypeWithState(property, state),
                    nullable: true
                };
                state.path.pop();
            }
        }

        state.path.pop();

        return new ObjectType(properties);
    } else if (isEnumForm(schema)) {
        throw formNotAllowedError("enum");
    } else if (isDiscriminatorForm(schema)) {
        throw formNotAllowedError("discriminator");
    } else {
        return PrimitiveType.ANY;
    }
}