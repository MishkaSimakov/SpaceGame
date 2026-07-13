import {Assign, ASTNode, ClassDef, Constant, Name, Subscript, Union} from "@src/tools/codegen/python/AST";

export function getEnum(name: string, options: string[]) {
    const body = options.map<Assign>(option =>
        new Assign(new Name(option), Constant.string(option)));

    return new ClassDef(name, body, [new Name("str"), new Name("Enum")]);
}

export function optional(node: ASTNode) {
    return new Union([node, Constant.none()]);
}

export function arrayOf(node: ASTNode) {
    return new Subscript(
        new Name("list"),
        node
    );
}

export function dictOf(node: ASTNode) {
    return new Subscript(
        new Name("dict"),
        node
    );
}

export function literal(value: string) {
    return new Subscript(
        new Name("Literal"),
        Constant.string(value)
    );
}

export function wrapInDefinition(info: { type: "definition", name: string } | { type: "inline" }, node: ASTNode) {
    if (info.type === "inline") {
        return node;
    } else {
        return new Assign(
            new Name(info.name),
            node
        );
    }
}
