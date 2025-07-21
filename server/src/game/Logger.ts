import {Action} from "./actions/Action";

export class Logger {
    handleAction(action: Action) {
        console.log("logger says:", action);
    }
}