export type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void
    reject: (reason?: any) => void
};

export function deferred<T>(): Deferred<T> {
    let def: any = {};

    def.promise = new Promise<T>((resolve, reject) => {
        def.resolve = resolve;
        def.reject = reject;
    });

    return def;
}

export function arrayOfDeferred<T>(length: number): Deferred<T>[] {
    const arr = [];

    for (let i = 0; i < length; i++) {
        arr.push(deferred());
    }

    return arr;
}
