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
import {
    ArrayType,
    Definition,
    EnumType,
    LiteralType,
    ObjectType,
    PrimitiveType,
    RecordType,
    Type,
    UnionType
} from "./AST";
import {typeMapping} from "./TypeMapping";

export function generateDefinitions(definitions: Record<string, Schema>) {
    const result: Record<string, Definition<any>> = {};

    for (const [name, schema] of Object.entries(definitions)) {
        result[name] = new Definition(
            name,
            generateDefinitionTypeWithState(schema, {
                path: [name],
                definitions: result
            }),
            true
        );
    }

    return result;
}

type GenerationState = {
    path: string[],
    definitions: Record<string, Definition<any>>
};

function generateDefinitionTypeWithState(schema: Schema, state: GenerationState): Type {
    if (state.path.length > 10) {
        throw new Error(`Reached depth limit. Path: ${state.path.join('/')}`);
    }

    if (isRefForm(schema)) {
        return state.definitions[schema.ref].getReference();
    } else if (isTypeForm(schema)) {
        return typeMapping[schema.type];
    } else if (isValuesForm(schema)) {
        state.path.push('values');
        const result = new RecordType(generateDefinitionTypeWithState(schema.values, state));
        state.path.pop();

        return result;
    } else if (isElementsForm(schema)) {
        state.path.push('elements');
        const result = new ArrayType(generateDefinitionTypeWithState(schema.elements, state));
        state.path.pop();

        return result;
    } else if (isPropertiesForm(schema)) {
        state.path.push('properties');

        const properties: Record<string, { type: Type, nullable: boolean }> = {};

        if (schema.properties) {
            for (const [name, property] of Object.entries(schema.properties)) {
                state.path.push(name)
                properties[name] = {
                    type: generateDefinitionTypeWithState(property, state),
                    nullable: false
                };
                state.path.pop();
            }
        }

        if (schema.optionalProperties) {
            for (const [name, property] of Object.entries(schema.optionalProperties)) {
                state.path.push(name)
                properties[name] = {
                    type: generateDefinitionTypeWithState(property, state),
                    nullable: true
                };
                state.path.pop();
            }
        }

        state.path.pop();

        return new ObjectType(properties);
    } else if (isEnumForm(schema)) {
        return new EnumType(schema.enum);
    } else if (isDiscriminatorForm(schema)) {
        state.path.push('discriminator');

        const options: ObjectType[] = [];

        for (const [name, option] of Object.entries(schema.mapping)) {
            state.path.push(name);
            const objectType = generateDefinitionTypeWithState(option, state) as ObjectType;
            state.path.pop();

            objectType.children[schema.discriminator] = {
                type: new LiteralType(name),
                nullable: false
            };

            options.push(objectType);
        }

        state.path.pop();

        return new UnionType(options);
    } else {
        return PrimitiveType.ANY;
    }
}