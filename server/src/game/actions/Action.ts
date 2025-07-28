export interface Action {
    type: string;
    payload?: any;

    //* Организация Meta, а также ее продукты Instagram и Facebook, признаны экстремистскими и запрещены на территории РФ.
    meta?: any;
}

export type ActionConstructor = (...args: any[]) => Action;
