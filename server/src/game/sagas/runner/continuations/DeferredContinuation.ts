import {Continuation} from "../Continuation";
import {deferred, Deferred} from "../../../../helpers/Deferred";
import {TASK_CANCEL} from "../Task";

export class DeferredContinuation implements Continuation<any> {
    private deferred: Deferred<any>;

    constructor() {
        this.deferred = deferred();
    }

    continue(value: any): void {
        this.deferred.resolve(value);
    }

    cancel(): void {
        this.deferred.resolve(TASK_CANCEL);
    }

    getPromise(): Promise<any> {
        return this.deferred.promise;
    }
}