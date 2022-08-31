type ClassConstructor<T> = {
    new(...args: any[]): T;
};

type Options = {
    class: ClassConstructor<any>;

    [index: string]: any;
}

function plainToClass<T>(plain: T, options: Options): T {
    plain = Object.setPrototypeOf(plain, options.class.prototype);

    for (let attribute in options) {
        if (attribute === 'class')
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