import {v4 as uuidv4} from 'uuid';

import {Action} from "./Action";

type ActionConstructor<T extends string, P, M, Args extends any[]> = (...args: Args) => Action<T, P, M>;

// Action helper function that returns an object with the action creator under the specified key
export function action<T extends string, P = undefined, M = undefined, Args extends any[] = []>(
    type: T,
    creator: (...args: Args) => { payload?: P; meta?: M } = (() => ({}))
): { [K in T]: ActionConstructor<T, P, M, Args> } {
    return {
        [type]: (...args: Args) => {
            const baseAction = creator(...args);
            return {
                uuid: uuidv4() as string,
                time: Date.now(),

                type,
                payload: baseAction.payload,
                meta: baseAction.meta
            };
        },
    } as { [K in T]: ActionConstructor<T, P, M, Args> };
}

export function request<Base extends string, ReqP, ReqM, ReqArgs extends any[], ResP, ResM, ResArgs extends any[]>(
    typeBase: Base,
    requestCreator: (...args: ReqArgs) => { payload?: ReqP; meta?: ReqM },
    responseCreator: (...args: ResArgs) => { payload?: ResP; meta?: ResM }
): { [K in `${Base}Request`]: ActionConstructor<`${Base}Request`, ReqP, ReqM, ReqArgs> }
    & { [K in `${Base}Response`]: ActionConstructor<`${Base}Response`, ResP, ResM, ResArgs> } {
    return {
        ...action(`${typeBase}Request`, requestCreator),
        ...action(`${typeBase}Response`, responseCreator)
    }
}

export type ActionOf<T extends ActionConstructor<string, any, any, any>> = ReturnType<T>;
