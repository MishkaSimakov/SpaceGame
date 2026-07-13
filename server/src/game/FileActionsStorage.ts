import path from "path";
import * as fs from "node:fs";

import {Action} from "@common/ActionsHelpers";
import {
    ActionPurpose,
    ActionWithStorageInfo,
    IActionsStorage,
} from "@src/game/interfaces/IActionsStorage";

export class FileActionsStorage implements IActionsStorage {
    logFilepath: string;

    constructor(logFilepath: string) {
        this.logFilepath = logFilepath;

        this.ensureLogFileExists();
    }

    appendAction(action: Action<string, any, any>, purpose: ActionPurpose, gameTime: number) {
        console.log("📝 logger recorded:", action.type);

        const forStorage: ActionWithStorageInfo = {
            action,
            purpose,

            storedAtGameTime: gameTime,
        };

        fs.appendFileSync(this.logFilepath, JSON.stringify(forStorage) + '\n');
    }

    getActionsWithStorageInfo(): ActionWithStorageInfo[] {
        const content = fs.readFileSync(this.logFilepath).toString().split("\n");

        return content
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => JSON.parse(line) as ActionWithStorageInfo);
    }

    private ensureLogFileExists() {
        // create directory
        const dir = path.dirname(this.logFilepath);

        fs.mkdirSync(dir, {recursive: true});

        // create file
        fs.appendFileSync(this.logFilepath, "");
    }
}