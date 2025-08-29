import {Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {CallEffect} from "../Effects";
import {SagaContinuation} from "./SagaContinuation";
import {ok} from "../../../../helpers/Result";

export class CallContinuation implements Continuation<CallEffect<any>["input"]> {
    private childContinuation: Continuation<any> | undefined = undefined;

    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(effect: CallEffect<any>["input"]): void {
        this.childContinuation = new SagaContinuation(this.env, effect.task(), this.consumer);
        this.childContinuation.continue(ok({}));
    }

    cancel(): void {
        this.childContinuation.cancel();
    }
}