import {isEffect, SagaGenerator} from "../Effects";
import {err, ok, Result} from "@common/helpers/Result";
import {Environment} from "../Environment";
import {Continuation} from "../Continuation";
import {effectContinuationsMap} from "./EffectContinuationsMap";
import * as assert from "node:assert";

export class SagaContinuation<V> implements Continuation<Result<V, any> | void> {
    private currentEffect: Continuation<any> | undefined;
    private aborted: boolean = false;

    constructor(
        private readonly env: Environment,
        private readonly iterator: SagaGenerator,
        private readonly consumer: Continuation<any>
    ) {
        this.env.abortHandle?.setAborter(this.abort.bind(this));
    }

    continue(value: Result<V, any> | void): void {
        this.currentEffect = undefined;

        if (this.aborted) {
            return;
        }

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

    abort(error: any) {
        if (!this.aborted) {
            this.aborted = true;

            try {
                const result = this.iterator.return(undefined);

                assert.ok(result.done, "Saga finalization code must not yield.");
            } catch (finalizationError) {
                console.error(`Error was thrown during post-abort saga finalization: ${finalizationError}`);
            }

            this.consumer.continue(err(error));
        }
    }
}