import * as Actions from "@common/Actions";

import {CancellableContinuation, Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {ok} from "../../../../helpers/Result";
import {TakeEffect} from "../Effects";

export class TakeContinuation<T extends keyof typeof Actions> implements CancellableContinuation<TakeEffect<T>["input"]> {
    private cancelled = false;

    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(effect: TakeEffect<T>["input"]): void {
        // TODO: possibly make cancellation more effective by removing listener entirely
        const listener = (payload: any) => {
            this.env.bus.off(effect.name, listener);

            if (!this.cancelled) {
                this.consumer.continue(ok(payload));
            }
        };

        this.env.bus.on(effect.name, listener);
    }

    cancel() {
        this.cancelled = true;
    }
}