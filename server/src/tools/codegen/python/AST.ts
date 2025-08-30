export interface ASTNode {
    emit(): string;
}

export class Name implements ASTNode {
    constructor(
        public name: string
    ) {
    }

    emit(): string {
        return this.name;
    }
}

export class ClassDef implements ASTNode {
    constructor(
        public name: string,
        public body: ASTNode[],
        public bases: ASTNode[] = [],
        public decorators: ASTNode[] = []
    ) {
    }

    emit() {
        let result = '';

        // decorators
        if (this.decorators.length > 0) {
            result += this.decorators.map(decorator => '@' + decorator.emit()).join('\n');
            result += '\n';
        }

        // class name + bases
        result += `class ${this.name}`;
        if (this.bases.length) {
            result += `(${this.bases.map(base => base.emit()).join(', ')})`;
        }
        result += ':\n';

        // class body
        result += this.body.map(child => '    ' + child.emit()).join('\n');

        return result;
    }
}

export class Assign implements ASTNode {
    constructor(
        public target: ASTNode,
        public value: ASTNode
    ) {
    }

    emit() {
        return `${this.target.emit()} = ${this.value.emit()}`;
    }
}

export class AnnAssign implements ASTNode {
    constructor(
        public target: ASTNode,
        public annotation: ASTNode
    ) {
    }

    emit() {
        return `${this.target.emit()}: ${this.annotation.emit()}`;
    }
}

export class Union implements ASTNode {
    constructor(
        public children: ASTNode[]
    ) {
    }

    emit() {
        return this.children.map(child => child.emit()).join(' | ');
    }
}

export class Constant implements ASTNode {
    constructor(
        public value: { type: "string", value: string } | { type: "none" }
    ) {
    }

    static string(value: string) {
        return new Constant({type: "string", value});
    }

    static none() {
        return new Constant({type: "none"});
    }

    emit() {
        if (this.value.type === "none") {
            return "None";
        } else {
            return `"${this.value.value}"`;
        }
    }
}

export class Subscript implements ASTNode {
    constructor(
        public value: ASTNode,
        public slice: ASTNode
    ) {
    }

    emit(): string {
        return `${this.value.emit()}[${this.slice.emit()}]`;
    }
}