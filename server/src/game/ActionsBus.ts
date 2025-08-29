import {Action} from "@common/ActionsHelpers";
import * as Actions from "@common/Actions"

export type ActionDescriptor = (keyof typeof Actions) | "*";

export type ActionListener<T extends ActionDescriptor> = (action:
                                                          T extends keyof typeof Actions
                                                              ? ReturnType<(typeof Actions)[T]>
                                                              : T extends "*" ? Action<string, any, any> : never) => void;

export abstract class Middleware {
    abstract apply(action: Action<string, any, any>): Action<string, any, any> | undefined;
}

const noop = () => {
};

export default class ActionsBus {
    private listeners = new Map<string, ActionListener<any>[]>();
    private listenersQueue: (() => void)[] = [];
    private isProcessingQueue: boolean = false;

    private middlewares: Middleware[] = [];

    emit<A extends Action<string, any, any>>(action: A, afterPerformCb: () => void = noop) {
        for (const middleware of this.middlewares) {
            action = middleware.apply(action) as A;

            if (action === undefined) {
                return;
            }
        }

        const listeners = Array.from(this.listeners.get(action.type) ?? []);

        const wildcardListeners = Array.from(this.listeners.get('*') ?? []);
        listeners.push(...wildcardListeners);

        this.listenersQueue.push(...listeners.map(l => l.bind(this, action)), afterPerformCb);

        this.#tryProcessQueue();
    }

    on<T extends ActionDescriptor>(actionDescriptor: T, listener: ActionListener<T>) {
        if (this.listeners.has(actionDescriptor)) {
            this.listeners.get(actionDescriptor)!.push(listener);
        } else {
            this.listeners.set(actionDescriptor, [listener]);
        }
    }

    off<T extends ActionDescriptor>(actionDescriptor: T, listener: ActionListener<T>) {
        const listeners = this.listeners.get(actionDescriptor);

        if (listeners && listeners.indexOf(listener) != -1) {
            listeners.splice(listeners.indexOf(listener), 1);
        }
    }

    registerMiddleware<T extends Middleware>(middleware: T) {
        this.middlewares.push(middleware);
    }

    #tryProcessQueue() {
        if (this.isProcessingQueue) {
            return;
        }

        this.isProcessingQueue = true;

        let listener: () => void;

        while ((listener = this.listenersQueue.shift()!)) {
            listener();
        }

        this.isProcessingQueue = false;
    }
}
