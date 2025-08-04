import {Action} from "@common/actions/Action";
import {appendFileSync, readFileSync} from "fs";

export class Logger {
    logFilepath: string;

    constructor(logFilepath: string) {
        this.logFilepath = logFilepath;
    }

    handleAction(action: Action) {
        console.log("📝 logger recorded:", action.type);
        appendFileSync(this.logFilepath, JSON.stringify(action) + '\n');
    }

    getPastActions(): Action[] {
        const content = readFileSync(this.logFilepath).toString().split("\n");

        return content
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => JSON.parse(line));
    }
}