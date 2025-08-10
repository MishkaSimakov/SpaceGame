import path from "path";
import * as fs from "node:fs";

import {Action} from "@common/actions/Action";

export class Logger {
    logFilepath: string;

    constructor(logFilepath: string) {
        this.logFilepath = logFilepath;

        this.ensureLogDirectoryExists();
    }

    handleAction(action: Action<string, any, any>) {
        console.log("📝 logger recorded:", action.type);
        fs.appendFileSync(this.logFilepath, JSON.stringify(action) + '\n');
    }

    getPastActions(): Action<string, any, any>[] {
        const content = fs.readFileSync(this.logFilepath).toString().split("\n");

        return content
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => JSON.parse(line));
    }

    ensureLogDirectoryExists() {
        const dir = path.dirname(this.logFilepath);

        fs.mkdirSync(dir, {recursive: true});
    }
}