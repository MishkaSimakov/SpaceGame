import * as assert from "node:assert";

export class AbortHandle {
    private aborter?: (error: any) => void;

    setAborter(aborter: (error: any) => void): void {
        this.aborter = aborter;
    }

    abort(error: any): void {
        assert.ok(this.aborter, "Aborter must be set by SagaContinuation constructor");

        this.aborter(error);
    }
}