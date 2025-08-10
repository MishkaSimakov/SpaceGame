import GameState from "../GameState";
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
import {Action} from "@common/actions/Action";

type Callback<R> = {
    (result: R): void,
    cancel?: () => void
};

type EffectsPerformers = {
    [Key in Effect["input"]["type"]]: {
        (effect: FindEffectByType<Key>["input"], callback: Callback<FindEffectByType<Key>["output"]>, services: {
            state: GameState,
            bus: ActionsBusProxy,
            pushTask: (saga: () => SagaGenerator<any>) => void
        }): void,
        cancel?: () => void;
    };
};

export const effectPerformers: EffectsPerformers = {
    select(effect, cb, {state}) {
        cb(structuredClone(state));
    },
    take(effect, cb, {bus}) {
        let cancelled = false;

        bus.once(effect.name, (payload: any) => {
            if (!cancelled) {
                cb(payload);
            }
        });

        cb.cancel = () => {
            cancelled = true;
        };
    },
    put(effect, cb, {bus}) {
        bus.emit(effect.action);
        cb({});
    },
    all(effect, cb, services) {
        const result = {};

        for (const key of Object.keys(effect.effects)) {
            const child = effect.effects[key].next().value as Effect["input"];

            // TODO: check later
            // @ts-ignore
            effectPerformers[child.type](child, (childPayload: any) => {
                // capture `key` variable
                const keyCopy = key;
                result[keyCopy] = childPayload;

                if (Object.keys(result).length === Object.keys(effect.effects).length) {
                    cb(result);
                }
            }, services);
        }

        cb.cancel = () => {
            // TODO
        };
    },
    newTask(effect, cb, {pushTask}) {
        pushTask(effect.task);
        cb({});
    }
};