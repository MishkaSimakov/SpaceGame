import {ok} from "@src/helpers/Result";
import {Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {TakeEffect} from "../Effects";
import {Action} from "@common/ActionsHelpers";
import {DeactivateSignal, PlayerLostSignal} from "@src/game/sagas/runner/Signals";

export class TakeContinuation implements Continuation<TakeEffect["input"]> {
    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(_: TakeEffect["input"]): void {
        // TODO: possibly make cancellation more effective by removing listener entirely
        const receiver = (message: Action | PlayerLostSignal | DeactivateSignal) => {
            this.consumer.continue(ok(message));
        };

        this.env.input.take(receiver);
    }
}