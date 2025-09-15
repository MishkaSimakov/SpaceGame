import * as Actions from "@common/Actions"
import {take, TakeEffect} from "@src/game/sagas/runner/Effects";

type ActionByType<T extends keyof typeof Actions> = ReturnType<(typeof Actions)[T]>;

export function* takeType<T extends keyof typeof Actions>(type: T): Generator<TakeEffect["input"], ActionByType<T>, ActionByType<T>> {
    while (true) {
        const action = yield* take();

        if (action.type === type) {
            return action as ActionByType<T>;
        }
    }
}
