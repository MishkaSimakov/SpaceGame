import {SagaGenerator} from "./Effects";
import {Environment} from "./Environment";
import {SagaContinuation} from "./continuations/SagaContinuation";
import {DeferredContinuation} from "./continuations/DeferredContinuation";

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