import ActionsBus, {ActionDescriptor, ActionListener} from "../ActionsBus";
import {Action} from "@common/actions/Action";

export class ActionsBusProxy {
    private emitStorage: Action<string, any, any>[] = [];
    private onceStorage: { actionDescriptor: ActionDescriptor, listener: ActionListener<any> }[] = [];

    constructor(private busRef: ActionsBus) {
    }

    emit<A extends Action<string, any, any>>(action: A) {
        this.emitStorage.push(action);
    }

    once<T extends ActionDescriptor>(actionDescriptor: T, listener: ActionListener<T>) {
        this.onceStorage.push({actionDescriptor, listener});
    }

    perform() {
        for (const listener of this.onceStorage) {
            this.busRef.once(listener.actionDescriptor, listener.listener);
        }

        for (const action of this.emitStorage) {
            this.busRef.emit(action);
        }
    }
}