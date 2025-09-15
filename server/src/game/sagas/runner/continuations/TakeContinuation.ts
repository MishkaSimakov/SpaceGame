import {ok} from "@src/helpers/Result";
import {CancellableContinuation, Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {TakeEffect} from "../Effects";

export class TakeContinuation implements CancellableContinuation<TakeEffect["input"]> {
    private cancelled = false;

    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(_: TakeEffect["input"]): void {
        // TODO: possibly make cancellation more effective by removing listener entirely
        const listener = (payload: any) => {
            this.env.bus.off('*', listener);

            if (!this.cancelled) {
                this.consumer.continue(ok(payload));
            }
        };

        this.env.bus.on('*', listener);
    }

    cancel() {
        this.cancelled = true;
    }
}