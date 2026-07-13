import * as assert from "node:assert";

import {IClock, Milliseconds} from "@src/game/interfaces/IClock";

export type TimeoutHandle = () => void;

export class GameClock {
    private shift: number = 0;
    private pausedAt: number | undefined = 0;

    private deadlines: [number, () => void][] = [];

    constructor(
        private wallClock: IClock
    ) {
        this.checkDeadlines();
    }

    getTime(): Milliseconds {
        return this.pausedAt ?? (this.wallClock.getTime() - this.shift);
    }

    pause() {
        assert.ok(!this.isPaused());

        this.pausedAt = this.getTime();
    }

    resume() {
        assert.ok(this.isPaused());

        this.shift = this.wallClock.getTime() - this.pausedAt!;
        this.pausedAt = undefined;
    }

    isPaused(): boolean {
        return this.pausedAt !== undefined;
    }

    setTime(time: Milliseconds) {
        if (this.isPaused()) {
            this.pausedAt = time;
        } else {
            this.shift = this.wallClock.getTime() - time;
        }
    }

    setTimeout(callback: () => void, delay: Milliseconds): TimeoutHandle {
        const deadline = this.getTime() + delay;

        this.deadlines.push([deadline, callback]);
        return callback;
    }

    removeTimeout(handle: TimeoutHandle) {
        this.deadlines = this.deadlines.filter(([, c]) => c != handle);
    }

    private checkDeadlines() {
        const currentTime = this.getTime();

        this.deadlines = this.deadlines.filter(([deadline, callback]) => {
            if (deadline <= currentTime) {
                callback();
                return false;
            }

            return true;
        });

        // TODO: remove constant deadlines checks
        this.wallClock.setTimeout(500, this.checkDeadlines.bind(this));
    }
}