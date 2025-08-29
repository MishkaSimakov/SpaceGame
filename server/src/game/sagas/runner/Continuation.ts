export interface Continuation<V> {
    continue(value: V): void;

    cancel(): void;
}