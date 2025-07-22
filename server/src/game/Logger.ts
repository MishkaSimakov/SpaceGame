import {Action} from "./actions/Action";
import path from "path";
import {appendFileSync} from "fs";

export class Logger {
    logPath: string;

    constructor() {
        this.logPath = path.join(__dirname, '/../../logs/', `game_${Date.now()}.txt`);
    }

    handleAction(action: Action) {
        console.log("📝 logger recorded:", action.type);
        appendFileSync(this.logPath, JSON.stringify(action) + '\n');
    }
}