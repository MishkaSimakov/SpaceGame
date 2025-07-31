import {Action} from "@common/actions/Action";
import path from "path";
import {appendFileSync} from "fs";

export class Logger {
    logFilepath: string;

    constructor(logFilepath: string) {
        this.logFilepath = logFilepath;
    }

    handleAction(action: Action) {
        console.log("📝 logger recorded:", action.type);
        appendFileSync(this.logFilepath, JSON.stringify(action) + '\n');
    }
}