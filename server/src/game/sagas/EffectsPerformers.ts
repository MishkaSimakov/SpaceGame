import {GameState} from "@common/Types";

import {ActionsBusProxy} from "./ActionsBusProxy";
import {
    AllEffect,
    Effect,
    EmptyObject, FindEffectByType,
    NewTaskEffect,
    PutEffect,
    SagaGenerator,
    SelectEffect,
    TakeEffect
} from "./Effects";

type Callback<R> = {
    (result: R): void,
    cancel?: () => void
};

type EffectsPerformers = {
    [Key in Effect["input"]["type"]]: {
        (effect: FindEffectByType<Key>["input"], callback: Callback<FindEffectByType<Key>["output"] | "cancel">, services: {
            state: GameState,
            busProxy: ActionsBusProxy,
            pushTask: (saga: () => SagaGenerator<any>) => void
        }): void,
        cancel?: () => void;
    };
};

// TODO: add typing
function getChildCallbacksForAll(effects: object, cb: any) {
    const result: Record<string, any> = {};

    const childCallbacks: Record<string, {
        callback: {
            (result: any): void,
            cancel: () => void
        },
        wasSetup: boolean
    }> = {};

    for (const key of Object.keys(effects)) {
        const callback = (childPayload: any) => {
            // capture `key` variable
            const keyCopy = key;
            result[keyCopy] = childPayload;

            if (Object.keys(result).length === Object.keys(effects).length) {
                cb(result);
            }
        };

        callback.cancel = () => {
        };

        childCallbacks[key] = {
            callback,
            wasSetup: false
        }
    }

    return childCallbacks;
}

export const effectPerformers: EffectsPerformers = {
    select(effect, cb, {state}) {
        cb(structuredClone(state));
    },
    take(effect, cb, {busProxy}) {
        let cancelled = false;

        cb.cancel = () => {
            cancelled = true;
            cb("cancel");
        };

        busProxy.once(effect.name, (payload: any) => {
            if (!cancelled) {
                cb(payload);
            }
        });
    },
    put(effect, cb, {busProxy}) {
        cb.cancel = () => {
        };

        busProxy.emit(effect.action);
        cb({});
    },
    all(effect, cb, services) {
        const childCallbacks = getChildCallbacksForAll(effect.effects, cb);

        for (const key of Object.keys(effect.effects)) {
            const child = effect.effects[key].next().value as Effect["input"];

            // TODO: check later
            // @ts-ignore
            effectPerformers[child.type](child, childCallbacks[key].callback, services);
            childCallbacks[key].wasSetup = true;
        }

        cb.cancel = () => {
            for (const cb of Object.values(childCallbacks)) {
                if (cb.wasSetup) {
                    cb.callback.cancel();
                }
            }
        };
    },
    newTask(effect, cb, {pushTask}) {
        pushTask(effect.task);
        cb({});
    }
};