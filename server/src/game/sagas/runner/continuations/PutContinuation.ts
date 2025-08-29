import {Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {PutEffect} from "../Effects";
import {ok, err} from "../../../../helpers/Result";

export class PutContinuation implements Continuation<PutEffect["input"]> {
    private cancelled: boolean = false;

    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(effect: PutEffect["input"]): void {
        this.env.bus.emit(effect.action)
            .then(() => {
                // this callback is performed only after all listeners of `effect.action` were called
                if (!this.cancelled) {
                    this.consumer.continue(ok({}));
                }
            })
            .catch(error => {
                this.consumer.continue(err(error));
            });
    }

    cancel(): void {
        this.cancelled = true;
    }
}