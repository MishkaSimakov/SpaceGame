import * as Actions from "@common/Actions";

import {Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {ok} from "../../../../helpers/Result";
import {TakeEffect} from "../Effects";

export class TakeContinuation<T extends keyof typeof Actions> implements Continuation<TakeEffect<T>["input"]> {
    private cancelled: boolean = false;

    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(effect: TakeEffect<T>["input"]): void {
        const listener = (payload: any) => {
            this.env.bus.off(effect.name, listener);

            if (!this.cancelled) {
                this.consumer.continue(ok(payload));
            }
        };

        this.env.bus.on(effect.name, listener);
    }

    cancel(): void {
        this.cancelled = true;
    }
}