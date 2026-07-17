import {Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {PutEffect} from "../Effects";
import {ok} from "@common/helpers/Result";

export class PutContinuation implements Continuation<PutEffect["input"]> {
    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(effect: PutEffect["input"]): void {
        // TODO: should these errors be passed into saga?
        this.env.output.putAndWait(effect.action, () => {
            this.consumer.continue(ok({}));
        });
    }
}