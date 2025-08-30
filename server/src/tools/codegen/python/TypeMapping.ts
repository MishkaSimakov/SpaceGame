import {SchemaFormType} from "jtd";

import {Name} from "@src/tools/codegen/python/AST";

const STRING = new Name("str");
const BOOLEAN = new Name("bool");
const INTEGER = new Name("int");
const FLOAT = new Name("float");

export const typeMapping: Record<SchemaFormType["type"], Name> = {
    string: STRING,
    boolean: BOOLEAN,
    float32: FLOAT,
    float64: FLOAT,
    int8: INTEGER,
    uint8: INTEGER,
    int16: INTEGER,
    uint16: INTEGER,
    int32: INTEGER,
    uint32: INTEGER,
    timestamp: STRING
};