import {IClock} from "@src/game/interfaces/IClock";

export class MockClock implements IClock {
    private time: number = 0;
    private timeouts: [number, () => void][] = [];

    getTime(): number {
        return this.time;
    }

    advanceTime(milliseconds: number) {
        this.time += milliseconds;

        this.timeouts = this.timeouts.filter(([deadline, callback]) => {
            if (deadline <= this.time) {
                callback();
                return false;
            }

            return true;
        })
    }

    setTimeout(timeout: number, callback: () => void): void {
        if (timeout <= 0) {
            callback();
        }

        const deadline = this.time + timeout;
        this.timeouts.push([deadline, callback]);
    }
}