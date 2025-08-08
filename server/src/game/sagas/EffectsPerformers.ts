import GameState from "../GameState";
import {ActionsBusProxy} from "./ActionsBusProxy";
import {
    AllEffect,
    Effect,
    EmptyObject,
    NewTaskEffect,
    PutEffect,
    SagaGenerator,
    SelectEffect,
    TakeEffect
} from "./Effects";
import {Action} from "@common/actions/Action";
import * as console from "node:console";

type Callback<R> = {
    (result: R): void,
    cancel?: () => void
};

type EffectsPerformers = {
    [key in Effect["type"]]: {
        (effect: any, callback: Callback<any>, services: {
            state: GameState,
            bus: ActionsBusProxy,
            pushTask: (saga: () => SagaGenerator) => void
        }): void,
        cancel?: () => void;
    };
};

export const effectPerformers: EffectsPerformers = {
    select(effect: SelectEffect, cb: Callback<GameState>, {state}) {
        cb(structuredClone(state));
    },
    take(effect: TakeEffect, cb: Callback<Action>, {bus}) {
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
    put(effect: PutEffect, cb: Callback<EmptyObject>, {bus}) {
        bus.emit(effect.action);
        cb({});
    },
    all(effect: AllEffect, cb: Callback<any>, services) {
        const result = {};

        for (const key of Object.keys(effect.effects)) {
            const child = effect.effects[key].next().value as Effect;

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
    newTask(effect: NewTaskEffect, cb: Callback<EmptyObject>, {pushTask}) {
        pushTask(effect.task);
        cb({});
    }
};