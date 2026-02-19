export interface Continuation<V> {
    continue(value: V): void;
}