import {IClock} from "@src/game/interfaces/IClock";

export class MockClock implements IClock {
    private time: number = 0;

    getTime(): number {
        return this.time;
    }

    advanceTime(milliseconds: number) {
        this.time += milliseconds;
    }

    setTime(milliseconds: number) {
        this.time = milliseconds;
    }
}