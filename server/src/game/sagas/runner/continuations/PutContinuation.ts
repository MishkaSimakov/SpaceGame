import {Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {PutEffect} from "../Effects";
import {ok, err} from "@src/helpers/Result";

export class PutContinuation implements Continuation<PutEffect["input"]> {
    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(effect: PutEffect["input"]): void {
        this.env.bus.emit(effect.action)
            .then(() => {
                this.consumer.continue(ok({}));
            })
            .catch(error => {
                this.consumer.continue(err(error));
            });
    }
}