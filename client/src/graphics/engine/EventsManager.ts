export default class EventsManager<EventsType extends string | number | symbol>{
    listeners: Record<EventsType, Function[]> = {} as Record<EventsType, Function[]>;

    constructor() {};

    on(event: EventsType, listener: Function) {
        if (this.listeners[event]) {
            this.listeners[event].push(listener);
        } else {
            this.listeners[event] = [listener];
        }
    }

    once(event: EventsType, listener: Function) {
        let newListener = (...args) => {
            listener(...args);

            let index = this.listeners[event].findIndex(cb => cb === newListener);

            if (index === -1) {
                console.error("Index not found in event listener once!!!!");
                return;
            }

            this.listeners[event].slice(index, 1);
        }

        this.on(event, newListener);
    }

    emit(event: EventsType, ...args) {
        if (!this.listeners[event])
            return;

        for (let listener of this.listeners[event]) {
            listener(...args);
        }
    }
}
