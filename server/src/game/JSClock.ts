import {IClock} from "@src/game/interfaces/IClock";

export class JSClock implements IClock {
    getTime(): number {
        return Date.now();
    }
}