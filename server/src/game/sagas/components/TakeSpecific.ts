import * as Actions from "@common/Actions"
import {take, TakeEffect} from "@src/game/sagas/runner/Effects";
import {deactivateSignal, playerTimeoutSignal} from "@src/game/sagas/runner/Signals";

type ActionByType<T extends keyof typeof Actions> = ReturnType<(typeof Actions)[T]>;

export function* takeType<T extends keyof typeof Actions>(type: T): Generator<TakeEffect["input"], ActionByType<T>, ActionByType<T>> {
    while (true) {
        const message = yield* take();

        if (message.type === 'deactivateSignal') {
            throw deactivateSignal;
        } else if (message.type === 'playerTimeoutSignal') {
            throw playerTimeoutSignal;
        } else if (message.type === type) {
            return message as ActionByType<T>;
        }
    }
}
