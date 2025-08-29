import {Continuation} from "../Continuation";
import {deferred, Deferred} from "../../../../helpers/Deferred";
import {Result} from "../../../../helpers/Result";

export class DeferredContinuation implements Continuation<any> {
    private deferred: Deferred<any>;

    constructor() {
        this.deferred = deferred();
    }

    continue(value: Result<any, any>): void {
        if (value._tag === "ok") {
            this.deferred.resolve(value.value);
        } else {
            this.deferred.reject(value.error);
        }
    }

    getPromise(): Promise<any> {
        return this.deferred.promise;
    }
}