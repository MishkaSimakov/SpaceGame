import {Action, ActionConstructor, ActionStub} from "@common/actions/Action";
import ActionsBus, {ActionListener} from "../ActionsBus";

export class ActionsBusProxy {
    private emitStorage: ActionStub[] = [];
    private onceStorage: { actionDescriptor: ActionConstructor | '*' | string, listener: ActionListener }[] = [];

    constructor(private busRef: ActionsBus) {
    }

    emit(action: ActionStub) {
        this.emitStorage.push(action);
    }

    once(actionDescriptor: ActionConstructor | '*' | string, listener: ActionListener) {
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