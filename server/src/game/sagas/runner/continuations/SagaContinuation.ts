import {isEffect, SagaGenerator} from "../Effects";
import {err, ok, Result} from "../../../../helpers/Result";
import {Environment} from "../Environment";
import {CancellableContinuation, Continuation} from "../Continuation";
import {effectContinuationsMap} from "./EffectContinuationsMap";

// calling task.cancel inside saga is UB!
// + saga cannot be async. Therefore, cancel may only be called during effect execution
export class SagaContinuation<V> implements Continuation<Result<V, any> | void> {
    private currentEffect: CancellableContinuation<any> | undefined;

    constructor(
        private readonly env: Environment,
        private readonly iterator: SagaGenerator,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(value: Result<V, any> | void): void {
        this.currentEffect = undefined;

        let result: IteratorResult<any>;

        try {
            if (!value) {
                result = this.iterator.next();
            } else if (value._tag === "ok") {
                result = this.iterator.next(value.value);
            } else {
                result = this.iterator.throw(value.error);
            }
        } catch (error) {
            this.consumer.continue(err(error));
            return;
        }

        if (result.done) {
            this.consumer.continue(ok(result.value));
        } else {
            if (isEffect(result.value)) {
                const effect = result.value;
                this.currentEffect = new effectContinuationsMap[effect.type](this.env, this);
                this.currentEffect.continue(effect);
            } else {
                this.continue(result.value);
            }
        }
    }

    throw(error: any) {
        console.log("throwing error into saga:", error);
        this.currentEffect?.cancel();
        this.continue(err(error));
    }
}