import {Action} from "@common/ActionsHelpers";
import * as Actions from "@common/Actions"
import {deferred, Deferred} from "../helpers/Deferred";

export type ActionDescriptor = (keyof typeof Actions) | "*";

export type ActionListener<T extends ActionDescriptor> = (action:
                                                          T extends keyof typeof Actions
                                                              ? ReturnType<(typeof Actions)[T]>
                                                              : T extends "*" ? Action<string, any, any> : never) => void;

export abstract class Middleware {
    abstract apply(action: Action<string, any, any>): Action<string, any, any> | undefined;
}

type ListenersFrame = {
    listeners: (() => void)[]
    deferred: Deferred<void>
};

export default class ActionsBus {
    private listeners = new Map<string, ActionListener<any>[]>();
    private listenersQueue: ListenersFrame[] = [];
    private isProcessingQueue: boolean = false;

    private middlewares: Middleware[] = [];

    lock(lambda: () => void) {
        const oldValue = this.isProcessingQueue;

        this.isProcessingQueue = true;

        lambda();

        this.isProcessingQueue = oldValue;

        this.tryProcessQueue();
    }

    emit<A extends Action<string, any, any>>(action: A): Promise<void> {
        const def = deferred<void>();

        try {
            for (const middleware of this.middlewares) {
                action = middleware.apply(action) as A;

                if (action === undefined) {
                    def.resolve();
                    return def.promise;
                }
            }
        } catch (error) {
            def.reject(error);
            return def.promise;
        }

        const listeners = Array.from(this.listeners.get(action.type) ?? []);

        const wildcardListeners = Array.from(this.listeners.get('*') ?? []);
        listeners.push(...wildcardListeners);

        this.listenersQueue.push({
            listeners: listeners.map(l => l.bind(this, action)),
            deferred: def
        });

        this.tryProcessQueue();

        return def.promise;
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

    private tryProcessQueue() {
        if (this.isProcessingQueue) {
            return;
        }

        this.isProcessingQueue = true;

        let frame: ListenersFrame;
        while ((frame = this.listenersQueue.shift()!)) {
            try {
                for (const listener of frame.listeners) {
                    listener();
                }

                frame.deferred.resolve();
            } catch (err) {
                frame.deferred.reject(err);
            }
        }

        this.isProcessingQueue = false;
    }
}
