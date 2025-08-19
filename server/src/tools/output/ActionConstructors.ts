import {v4 as uuidv4} from 'uuid';

export function constructAction<T extends string, P, M>(type: T, payload: P, meta: M) {
    return {
        uuid: uuidv4() as string,
        time: Date.now(),

        type, payload, meta
    };
}