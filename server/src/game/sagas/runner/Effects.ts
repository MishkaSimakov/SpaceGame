import {Action} from "@common/ActionsHelpers";
import {GameState} from "@common/Types";
import * as Actions from "@common/Actions"

export type EmptyObject = Record<string, never>;

export type SelectEffect = {
    input: {
        type: "select";
    },
    output: GameState
};

export type PutEffect = {
    input: {
        type: "put";
        action: Action<string, any, any>;
    },
    output: EmptyObject
};

export type TakeEffect = {
    input: {
        type: "take";
    },
    output: ReturnType<(typeof Actions)[keyof typeof Actions]>
};

export type Effect =
    | SelectEffect
    | PutEffect
    | TakeEffect;

type GeneratorForEffect<E extends Effect> = Generator<E["input"], E["output"], E["output"]>;

export function* select(): GeneratorForEffect<SelectEffect> {
    return yield {
        type: "select"
    };
}

export function* put(action: Action<string, any, any>): GeneratorForEffect<PutEffect> {
    return yield {
        type: "put",
        action: action
    };
}

export function* take(): GeneratorForEffect<TakeEffect> {
    return yield {
        type: "take"
    };
}

export function isEffect(value: any): value is Effect["input"] {
    return typeof value === "object"
        && "type" in value && typeof value.type === "string";
}

export type SagaGenerator = Generator<any>;