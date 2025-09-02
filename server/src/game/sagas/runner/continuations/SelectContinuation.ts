import {CancellableContinuation, Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {SelectEffect} from "../Effects";
import {ok} from "../../../../helpers/Result";

export class SelectContinuation implements CancellableContinuation<SelectEffect["input"]> {
    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(effect: SelectEffect["input"]): void {
        this.consumer.continue(ok(structuredClone(this.env.state)));
    }

    cancel() {
        // this effect is not cancellable
    }
}