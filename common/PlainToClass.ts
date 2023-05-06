type ClassConstructor<T> = {
    new(...args: any[]): T;
};

type Options = {
    class?: ClassConstructor<any>;
    classifier?: (plain: any) => ClassConstructor<any>;

    [index: string]: any;
};

function plainToClass<T>(plain: T, options: Options): T {
    if (options.class) {
        plain = Object.setPrototypeOf(plain, options.class.prototype);
    } else if (options.classifier) {
        plain = Object.setPrototypeOf(plain, options.classifier(plain).prototype);
    }

    for (let attribute in options) {
        if (attribute === 'class' || attribute === 'classifier')
            continue;

        if (Array.isArray(plain[attribute])) {
            for (let el in plain[attribute]) {
                plain[attribute][el] = plainToClass(plain[attribute][el], options[attribute]);
            }
        } else {
            plain[attribute] = plainToClass(plain[attribute], options[attribute]);
        }
    }

    return plain;
}

export {
    plainToClass, Options, ClassConstructor
}