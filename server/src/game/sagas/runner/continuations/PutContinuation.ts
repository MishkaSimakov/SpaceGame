import {CancellableContinuation, Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {PutEffect} from "../Effects";
import {ok, err} from "@src/helpers/Result";

export class PutContinuation implements CancellableContinuation<PutEffect["input"]> {
    private cancelled = false;

    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(effect: PutEffect["input"]): void {
        this.env.bus.emit(effect.action)
            .then(() => {
                if (!this.cancelled) {
                    this.consumer.continue(ok({}));
                }
            })
            .catch(error => {
                // TODO: error escapes!
                if (!this.cancelled) {
                    this.consumer.continue(err(error));
                } else {
                    console.warn("💀 error escaped in PutContinuation:", error);
                }
            });
    }

    cancel() {
        this.cancelled = true;
    }
}