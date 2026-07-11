import {ok} from "@common/helpers/Result";
import {Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {TakeEffect} from "../Effects";
import {Action} from "@common/ActionsHelpers";

export class TakeContinuation implements Continuation<TakeEffect["input"]> {
    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(_: TakeEffect["input"]): void {
        // TODO: possibly make cancellation more effective by removing listener entirely
        const receiver = (message: Action) => {
            this.consumer.continue(ok(message));
        };

        this.env.input.take(receiver);
    }
}