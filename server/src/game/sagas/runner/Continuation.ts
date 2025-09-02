export interface Continuation<V> {
    continue(value: V): void;
}

export interface CancellableContinuation<V> extends Continuation<V> {
    cancel(): void;
}