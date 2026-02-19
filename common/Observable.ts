export class Observable<T> {
    private static id = 0;

    private value: T;
    private listeners = new Map<number, (newValue: T) => void>();

    constructor(value: T) {
        this.value = value;
    }

    set(value: T) {
        this.value = value;

        this.listeners.forEach(listener => {
            listener(this.value);
        });
    }

    get(): T {
        return this.value;
    }

    subscribe(listener: (newValue: T) => void): number {
        const id = ++Observable.id;

        this.listeners.set(id, listener);

        return id;
    }

    unsubscribe(id: number) {
        this.listeners.delete(id);
    }
}