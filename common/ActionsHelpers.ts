import {v4 as uuidv4} from 'uuid';

export interface Action<T extends string, P, M = unknown> {
    uuid: string;
    time: number;

    type: T;
    payload: P;

    //* Организация Meta, а также ее продукты Instagram и Facebook, признаны экстремистскими и запрещены на территории РФ.
    meta?: M;
}


export function constructAction<T extends string, P, M>(type: T, payload: P, meta: M): Action<T, P, M> {
    return {
        uuid: uuidv4() as string,
        time: Date.now(),

        type, payload, meta
    };
}

export function isAction(value: any): value is Action<any, any, any> {
    return typeof value === 'object'
        && 'uuid' in value
        && 'time' in value && !Number.isNaN(Number(value['time']))
        && 'type' in value
        && 'payload' in value && typeof value.payload === 'object'
}