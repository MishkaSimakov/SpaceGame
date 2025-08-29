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

export type TakeEffect<T extends keyof typeof Actions> = {
    input: {
        type: "take";
        name: T;
    },
    output: ReturnType<(typeof Actions)[T]>
};

export type CallEffect<R> = {
    input: {
        type: "call",
        task: () => SagaGenerator
    },
    output: R | "cancel"
};

// all effect
type EffectUnion =
    | SelectEffect
    | PutEffect
    | TakeEffect<keyof typeof Actions>
    | CallEffect<any>;

export type GeneratorReturnValue<T> = T extends Generator<any, infer R, any> ? R : never;

export type AllEffect<T extends Record<string, GeneratorForEffect<EffectUnion>>> = {
    input: {
        type: "all",
        effects: T
    },
    output: {
        [Key in keyof T]: GeneratorReturnValue<T[Key]>
    }
};

export type Effect = EffectUnion | AllEffect<any>;

export type FindEffectByType<T> =
    Effect extends infer E
        ? E extends { input: { type: T } }
            ? E
            : never
        : never;

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

export function* take<T extends keyof typeof Actions>(actionDescriptor: T): GeneratorForEffect<TakeEffect<T>> {
    return yield {
        type: "take",
        name: actionDescriptor
    };
}

export function* call<R>(task: () => SagaGenerator): GeneratorForEffect<CallEffect<R>> {
    return yield {
        type: "call",
        task: task
    };
}

export function* all<T extends Record<string, GeneratorForEffect<EffectUnion>>>(effects: T): GeneratorForEffect<AllEffect<T>> {
    return yield {
        type: "all",
        effects: effects
    };
}

export function isEffect(value: any): value is Effect["input"] {
    return typeof value === "object"
        && "type" in value && typeof value.type === "string";
}

export type SagaGenerator = Generator<any>;