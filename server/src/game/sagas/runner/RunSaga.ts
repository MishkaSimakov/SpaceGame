import {SagaGenerator} from "./Effects";
import {Environment} from "./Environment";
import {SagaContinuation} from "./continuations/SagaContinuation";
import {DeferredContinuation} from "./continuations/DeferredContinuation";
import {Observable} from "@common/Observable";

export function runSaga<Args extends any[]>(env: Environment, saga: (...args: Args) => SagaGenerator, ...args: Args) {
    const def = new DeferredContinuation();
    const continuation = new SagaContinuation(
        env,
        saga(...args),
        def
    );

    continuation.continue();

    return def.getPromise();
}

export function runSagaWithThrowHandle<Args extends any[]>(
    env: Environment,
    throwHandle: Observable<any>,
    saga: (...args: Args) => SagaGenerator,
    ...args: Args
) {
    const def = new DeferredContinuation();
    const continuation = new SagaContinuation(
        env,
        saga(...args),
        def
    );

    throwHandle.onSet(newValue => {
        if (newValue) {
            continuation.throw(newValue);
        }
    });

    continuation.continue();

    return def.getPromise();
}