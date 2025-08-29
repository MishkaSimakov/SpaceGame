import {Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {AllEffect} from "../Effects";

export class AllContinuation implements Continuation<AllEffect<any>["input"]> {
    private cancelled: boolean = false;

    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(effect: AllEffect<any>["input"]): void {

    }

    cancel(): void {
        this.cancelled = true;
    }
}