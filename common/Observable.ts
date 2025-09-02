export class Observable<T> {
    private value: T;
    private listeners: ((newValue: T) => void)[] = [];

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

    onSet(listener: (newValue: T) => void) {
        this.listeners.push(listener);
    }
}