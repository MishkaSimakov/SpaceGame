import {isEffect, SagaGenerator} from "../Effects";
import {TASK_CANCEL} from "../Task";
import {ok, Result} from "../../../../helpers/Result";
import {Environment} from "../Environment";
import {Continuation} from "../Continuation";
import {effectContinuationsMap} from "./EffectContinuationsMap";

// calling task.cancel inside saga is UB!
// + saga cannot be async. Therefore, cancel may only be called during effect execution
export class SagaContinuation<V> implements Continuation<Result<V, any> | void> {
    private cancelled: boolean = false;
    private currentEffect: Continuation<any> | undefined;

    constructor(
        private readonly env: Environment,
        private readonly iterator: SagaGenerator,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(value: Result<V, any> | void): void {
        this.currentEffect = undefined;

        let result: IteratorResult<any>;

        if (!value) {
            result = this.iterator.next();
        } else if (value._tag === "ok") {
            if (value.value === TASK_CANCEL) {
                result = this.iterator.return(TASK_CANCEL);
            } else {
                result = this.iterator.next(value.value);
            }
        } else if (value._tag === "err") {
            result = this.iterator.throw(value.error);
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

    cancel(): void {
        if (this.cancelled) {
            return;
        }

        this.cancelled = true;

        if (this.currentEffect) {
            this.currentEffect.cancel();
        }

        this.consumer.cancel();
    }
}