import {Action, ActionConstructor} from "./Action";

type ActionListener = (action: Action) => void;

export default class ActionsBus {
    private listeners = new Map<string, ActionListener[]>();
    private listenersQueue: (() => void)[] = [];
    private isProcessingQueue: boolean = false;


    emit(action: Action) {
        const listeners = Array.from(this.listeners.get(action.type) ?? []);

        const wildcardListeners = Array.from(this.listeners.get('*') ?? []);
        listeners.push(...wildcardListeners);

        this.listenersQueue.push(...listeners.map(l => l.bind(this, action)));

        this.#tryProcessQueue();
    }

    on(actionDescriptor: ActionConstructor | '*' | string, listener: ActionListener) {
        const name = this.#getActionName(actionDescriptor);

        if (this.listeners.has(name)) {
            this.listeners.get(name)!.push(listener);
        } else {
            this.listeners.set(name, [listener]);
        }
    }

    off(actionDescriptor: ActionConstructor | '*' | string, listener: ActionListener) {
        const listeners = this.listeners.get(this.#getActionName(actionDescriptor));

        if (listeners && listeners.indexOf(listener) != -1) {
            listeners.splice(listeners.indexOf(listener), 1);
        }
    }

    once(actionDescriptor: ActionConstructor | '*' | string, listener: ActionListener) {
        const onceListener = (payload: any) => {
            listener(payload);
            this.off(actionDescriptor, onceListener);
        };

        this.on(actionDescriptor, onceListener);
    }

    #tryProcessQueue() {
        if (this.isProcessingQueue) {
            return;
        }

        this.isProcessingQueue = true;

        let listener: () => void;

        while (listener = this.listenersQueue.shift()) {
            listener();
        }

        this.isProcessingQueue = false;
    }

    #getActionName(actionDescriptor: ActionConstructor | '*' | string) {
        if (typeof actionDescriptor === 'string') {
            return actionDescriptor;
        }

        return actionDescriptor.name;
    }
}