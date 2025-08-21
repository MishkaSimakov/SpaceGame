import {SchemaFormType} from "jtd";
import {PrimitiveType} from "./AST";

export const typeMapping: Record<SchemaFormType["type"], PrimitiveType> = {
    string: PrimitiveType.STRING,
    boolean: PrimitiveType.BOOLEAN,
    float32: PrimitiveType.NUMBER,
    float64: PrimitiveType.NUMBER,
    int8: PrimitiveType.NUMBER,
    uint8: PrimitiveType.NUMBER,
    int16: PrimitiveType.NUMBER,
    uint16: PrimitiveType.NUMBER,
    int32: PrimitiveType.NUMBER,
    uint32: PrimitiveType.NUMBER,
    timestamp: PrimitiveType.STRING
};