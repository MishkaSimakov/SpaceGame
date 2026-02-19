import {v4 as uuidv4} from 'uuid';

export interface Action<T extends string = string, P = unknown, M = unknown> {
    uuid: string;

    type: T;
    payload: P;

    responseTo?: string;

    //* Организация Meta, а также ее продукты Instagram и Facebook, признаны экстремистскими и запрещены на территории РФ.
    meta?: M;
}

// this thing works only in strict Typescript mode!
type UndefinedToOptional<T> = {
    [K in keyof T as undefined extends T[K] ? K : never]?: T[K];
} & {
    [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

export function constructAction<T extends string, P, M>(type: T, payload: P, meta?: M):
    Action<T, UndefinedToOptional<P>, M> {
    // remove properties with "undefined" value in payload
    const cleanPayload = Object.fromEntries(
        Object.entries(payload as Record<string, unknown>)
            .filter(([_, v]) => v !== undefined)
    ) as UndefinedToOptional<P>;

    return {
        uuid: uuidv4() as string,

        type,
        payload: cleanPayload,
        meta
    };
}

export function isAction(value: any): value is Action<any, any, any> {
    return typeof value === 'object'
        && 'uuid' in value
        && 'type' in value
        && 'payload' in value && typeof value.payload === 'object'
}