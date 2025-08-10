export interface Action<T extends string, P, M = unknown> {
    uuid: string;
    time: number;

    type: T;
    payload?: P;

    //* Организация Meta, а также ее продукты Instagram и Facebook, признаны экстремистскими и запрещены на территории РФ.
    meta?: M;
}

export function isAction(object: any): object is Action<string, any, any> {
    return "type" in object && typeof object.type === "string";
}