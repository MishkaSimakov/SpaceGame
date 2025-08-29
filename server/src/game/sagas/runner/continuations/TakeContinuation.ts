import * as Actions from "@common/Actions";

import {Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {ok} from "../../../../helpers/Result";
import {TakeEffect} from "../Effects";

export class TakeContinuation<T extends keyof typeof Actions> implements Continuation<TakeEffect<T>["input"]> {
    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(effect: TakeEffect<T>["input"]): void {
        const listener = (payload: any) => {
            this.env.bus.off(effect.name, listener);

            this.consumer.continue(ok(payload));
        };

        this.env.bus.on(effect.name, listener);
    }
}