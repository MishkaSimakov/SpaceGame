import {expect, test} from "vitest";
import {CancellableRaceProtocol, IParticipant} from "@src/game/CancellableRaceProtocol";
import {deferred} from "@common/helpers/Deferred";

test('simpleRace', async () => {
    const first_def = deferred<void>();
    const second_def = deferred<void>();

    const sequence: string[] = []

    class FirstParticipant implements IParticipant {
        cancel(): void {
            sequence.push("first cancel");
        }

        isReady(): boolean {
            sequence.push("first isReady");
            return false;
        }

        prepare(): Promise<void> {
            sequence.push("first prepare");
            return first_def.promise;
        }

        proceed(): void {
            sequence.push("first proceed");
        }
    }

    class SecondParticipant implements IParticipant {
        cancel(): void {
            sequence.push("second cancel");
        }

        isReady(): boolean {
            sequence.push("second isReady");
            return false;
        }

        prepare(): Promise<void> {
            sequence.push("second prepare");
            return second_def.promise;
        }

        proceed(): void {
            sequence.push("second proceed");
        }
    }

    const promise = new CancellableRaceProtocol([new FirstParticipant(), new SecondParticipant()]).perform();

    first_def.resolve();

    await promise;

    expect(sequence).toEqual(["first isReady", "second isReady", "first prepare", "second prepare", "second cancel", "first proceed"]);
});

test('firstReady', async () => {
    const first_def = deferred<void>();
    const second_def = deferred<void>();

    const sequence: string[] = []

    class FirstParticipant implements IParticipant {
        cancel(): void {
            sequence.push("first cancel");
        }

        isReady(): boolean {
            sequence.push("first isReady");
            return true;
        }

        prepare(): Promise<void> {
            sequence.push("first prepare");
            return first_def.promise;
        }

        proceed(): void {
            sequence.push("first proceed");
        }
    }

    class SecondParticipant implements IParticipant {
        cancel(): void {
            sequence.push("second cancel");
        }

        isReady(): boolean {
            sequence.push("second isReady");
            return false;
        }

        prepare(): Promise<void> {
            sequence.push("second prepare");
            return second_def.promise;
        }

        proceed(): void {
            sequence.push("second proceed");
        }
    }

    const promise = new CancellableRaceProtocol([new FirstParticipant(), new SecondParticipant()]).perform();

    first_def.resolve();

    await promise;

    expect(sequence).toEqual(["first isReady", "second cancel", "first proceed"]);
});

test('secondReady', async () => {
    const first_def = deferred<void>();
    const second_def = deferred<void>();

    const sequence: string[] = []

    class FirstParticipant implements IParticipant {
        cancel(): void {
            sequence.push("first cancel");
        }

        isReady(): boolean {
            sequence.push("first isReady");
            return false;
        }

        prepare(): Promise<void> {
            sequence.push("first prepare");
            return first_def.promise;
        }

        proceed(): void {
            sequence.push("first proceed");
        }
    }

    class SecondParticipant implements IParticipant {
        cancel(): void {
            sequence.push("second cancel");
        }

        isReady(): boolean {
            sequence.push("second isReady");
            return true;
        }

        prepare(): Promise<void> {
            sequence.push("second prepare");
            return second_def.promise;
        }

        proceed(): void {
            sequence.push("second proceed");
        }
    }

    const promise = new CancellableRaceProtocol([new FirstParticipant(), new SecondParticipant()]).perform();

    first_def.resolve();

    await promise;

    expect(sequence).toEqual(["first isReady", "second isReady", "first cancel", "second proceed"]);
});

test('bothReady', async () => {
    const first_def = deferred<void>();
    const second_def = deferred<void>();

    const sequence: string[] = []

    class FirstParticipant implements IParticipant {
        cancel(): void {
            sequence.push("first cancel");
        }

        isReady(): boolean {
            sequence.push("first isReady");
            return true;
        }

        prepare(): Promise<void> {
            sequence.push("first prepare");
            return first_def.promise;
        }

        proceed(): void {
            sequence.push("first proceed");
        }
    }

    class SecondParticipant implements IParticipant {
        cancel(): void {
            sequence.push("second cancel");
        }

        isReady(): boolean {
            sequence.push("second isReady");
            return true;
        }

        prepare(): Promise<void> {
            sequence.push("second prepare");
            return second_def.promise;
        }

        proceed(): void {
            sequence.push("second proceed");
        }
    }

    const promise = new CancellableRaceProtocol([new FirstParticipant(), new SecondParticipant()]).perform();

    first_def.resolve();

    await promise;

    expect(sequence).toEqual(["first isReady", "second cancel", "first proceed"]);
});

test('throwInPrepare', async () => {
    const first_def = deferred<void>();
    const second_def = deferred<void>();

    const sequence: string[] = []

    class FirstParticipant implements IParticipant {
        cancel(): void {
            sequence.push("first cancel");
        }

        isReady(): boolean {
            sequence.push("first isReady");
            return false;
        }

        prepare(): Promise<void> {
            sequence.push("first prepare");
            throw 123;
        }

        proceed(): void {
            sequence.push("first proceed");
        }
    }

    class SecondParticipant implements IParticipant {
        cancel(): void {
            sequence.push("second cancel");
        }

        isReady(): boolean {
            sequence.push("second isReady");
            return false;
        }

        prepare(): Promise<void> {
            sequence.push("second prepare");
            return second_def.promise;
        }

        proceed(): void {
            sequence.push("second proceed");
        }
    }

    const promise = new CancellableRaceProtocol([new FirstParticipant(), new SecondParticipant()]).perform();

    try {
        await promise;
        expect.unreachable("should have thrown");
    } catch (error) {
        expect(error).toEqual(123);
    }

    expect(sequence).toEqual(["first isReady", "second isReady", "first prepare", "second prepare", "second cancel"]);
});

test('bothResolve', async () => {
    const first_def = deferred<void>();
    const second_def = deferred<void>();

    const sequence: string[] = []

    class FirstParticipant implements IParticipant {
        cancel(): void {
            sequence.push("first cancel");
        }

        isReady(): boolean {
            sequence.push("first isReady");
            return false;
        }

        prepare(): Promise<void> {
            sequence.push("first prepare");
            return first_def.promise;
        }

        proceed(): void {
            sequence.push("first proceed");
        }
    }

    class SecondParticipant implements IParticipant {
        cancel(): void {
            sequence.push("second cancel");
        }

        isReady(): boolean {
            sequence.push("second isReady");
            return false;
        }

        prepare(): Promise<void> {
            sequence.push("second prepare");
            return second_def.promise;
        }

        proceed(): void {
            sequence.push("second proceed");
        }
    }

    const promise = new CancellableRaceProtocol([new FirstParticipant(), new SecondParticipant()]).perform();

    first_def.resolve();
    second_def.resolve();

    await promise;

    const areArraysEqual = <T>(first: T[], second: T[]) => {
        return first.length == second.length &&
            first.every((this_i, i) => {
                return this_i == second[i]
            });
    }

    const option_1 = ["first isReady", "second isReady", "first prepare", "second prepare", "second cancel", "first proceed"];
    const option_2 = ["first isReady", "second isReady", "first prepare", "second prepare", "first cancel", "second proceed"];
    expect(areArraysEqual(sequence, option_1) || areArraysEqual(sequence, option_2)).toBeTruthy();
});