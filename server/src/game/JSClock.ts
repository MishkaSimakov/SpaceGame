import {IClock} from "@src/game/interfaces/IClock";


export class JSClock implements IClock {
    setTimeout(timeout: number, callback: () => void): void {
        setTimeout(callback, timeout);
    }

    getTime(): number {
        return Date.now();
    }
}