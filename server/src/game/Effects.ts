import {Action} from "./actions/Action";
import GameState from "./GameState";

type EmptyObject = Record<string, never>;

export type SelectEffect = {
    type: "select";
}

export type PutEffect = {
    type: "put";
    action: Action;
}

export type TakeEffect = {
    type: "take";
    name: string;
}

export type AllEffect = {
    type: "all",
    effects: AllInput
}

export type Effect = SelectEffect | PutEffect | TakeEffect | AllEffect;

type SelectGenerator = Generator<SelectEffect, GameState, GameState>;
type PutGenerator = Generator<PutEffect, EmptyObject, EmptyObject>;
type TakeGenerator = Generator<TakeEffect, Action, Action>;

export function* select(): SelectGenerator {
    return yield {
        type: "select"
    };
}

export function* put(action: Action): PutGenerator {
    return yield {
        type: "put",
        action: action
    };
}

export function* take(action: (...args: any[]) => Action): TakeGenerator {
    return yield {
        type: "take",
        name: action.name
    };
}

type GeneratorReturnType<T extends Generator> = T extends Generator<any, infer R, any> ? R : never
type AllOutput<T extends AllInput> = {
    [Key in keyof T]: GeneratorReturnType<T[Key]>
};

type AllInput = {
    [key: string]: SelectGenerator | PutGenerator | TakeGenerator
};

type AllGenerator<T extends AllInput> = Generator<AllEffect, AllOutput<T>, AllOutput<T>>

export function* all<T extends AllInput>(effects: T): AllGenerator<T> {
    return yield {
        type: "all",
        effects: effects
    };
}

export type SagaGenerator = Generator;