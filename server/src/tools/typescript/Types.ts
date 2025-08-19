export class Definition<T extends Type> {
    constructor(
        public name: string,
        public child: T,
        public isExported: boolean
    ) {
    }

    emit() {
        let result = "";

        if (this.isExported) {
            result += "export ";
        }

        if (this.child instanceof EnumType) {
            result += `enum ${this.name} ${this.child.emitForDefinition()}`;
        } else {
            result += `type ${this.name} = ${this.child.emitForDefinition()};`;
        }

        return result;
    }

    getReference() {
        return new ReferenceType(this.name);
    }
}

interface IType {
    emitInline(): string;

    emitForDefinition(): string;
}

export class PrimitiveType implements IType {
    static NUMBER = new PrimitiveType('number');
    static STRING = new PrimitiveType('string');
    static BOOLEAN = new PrimitiveType('boolean');
    static ANY = new PrimitiveType('any');
    static UNDEFINED = new PrimitiveType('undefined');

    private constructor(
        public typeName: string
    ) {
    }

    emitInline(): string {
        return this.typeName;
    }

    emitForDefinition(): string {
        return this.emitInline();
    }
}

export class RecordType<V extends Type> implements IType {
    constructor(
        public valueType: V
    ) {
    }

    emitInline(): string {
        return `Record<string, ${this.valueType.emitInline()}>`;
    }

    emitForDefinition(): string {
        return this.emitInline();
    }
}

export class ObjectType implements IType {
    constructor(
        public children: Record<string, Type>
    ) {
    }

    emitInline(): string {
        const properties = Object.entries(this.children)
            .map(([name, type]) => `${name}: ${type.emitInline()}`)
            .join(', ');

        return `{ ${properties} }`;
    }

    emitForDefinition(): string {
        let result = '{\n';

        for (const [name, type] of Object.entries(this.children)) {
            result += `    ${name}: ${type.emitInline()},\n`;
        }

        result += '}';

        return result;
    }
}

export class EnumType implements IType {
    constructor(
        public options: string[]
    ) {
    }

    emitInline(): string {
        throw new Error('Enum can not be inlined');
    }

    emitForDefinition(): string {
        let result = '{\n';

        for (const option of this.options) {
            result += `    ${option} = "${option}",\n`;
        }

        result += '}';

        return result;
    }
}

export class UnionType<Args extends Type[]> implements IType {
    constructor(
        public children: Args
    ) {
    }

    emitInline(): string {
        return this.children.map(child => child.emitInline()).join(' | ');
    }

    emitForDefinition(): string {
        return this.emitInline();
    }
}

export class ReferenceType implements IType {
    constructor(
        public typeName: string
    ) {
    }

    emitInline() {
        return this.typeName;
    }

    emitForDefinition(): string {
        return this.emitInline();
    }
}

export class ArrayType<T extends Type> implements IType {
    constructor(
        public child: T
    ) {
    }

    emitInline(): string {
        return `${this.child.emitInline()}[]`;
    }

    emitForDefinition(): string {
        return `${this.child.emitForDefinition()}[]`;
    }
}

export class LiteralType implements IType {
    constructor(
        public literal: string
    ) {
    }

    emitInline(): string {
        return `"${this.literal}"`;
    }

    emitForDefinition(): string {
        return this.emitInline();
    }
}

export type Type =
    | PrimitiveType
    | RecordType<any>
    | ObjectType
    | EnumType
    | UnionType<any>
    | ReferenceType
    | ArrayType<any>
    | LiteralType;