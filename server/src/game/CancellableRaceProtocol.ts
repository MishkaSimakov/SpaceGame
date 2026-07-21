export interface IParticipant {
    // this is a short-cut to avoid unnecessary operations when a result is already known
    isReady(): boolean;

    // This method is intended to set up all timers/calculations that would lead to eventual
    // promise fulfillment or rejection
    prepare(): Promise<void>;

    // This method is intended to cancel all timers/calculations that were set up in `prepare` method.
    // Still promise may be resolved/rejected after call to `cancel`
    // cancel must not throw!
    cancel(): void;

    // This method is called for exactly one participant. It is performed after all other participants were cancelled.
    proceed(): void;

    // It is guaranteed that at most one of `cancel` and `proceed` will be called
}

type RaceWinnerStatus = { ok: true, index: number } | { ok: false, index: number, error: any };

export class CancellableRaceProtocol {
    constructor(
        private readonly participants: IParticipant[]
    ) {
    }

    async perform(): Promise<void> {
        const readyParticipant = this.findReadyParticipant();

        if (readyParticipant !== undefined) {
            this.performWinner(readyParticipant);
            return;
        }

        // Wrap each prepare() so it never rejects — instead it resolves with a discriminated object
        const wrapped = this.participants.map(async (p, index) => {
            try {
                await p.prepare();
                return {index, ok: true as const};
            } catch (err) {
                return {index, ok: false as const, error: err};
            }
        });

        // Wait for the first participant to settle (either fulfilled or rejected)
        const winner = await Promise.race(wrapped);

        this.performWinner(winner);
    }

    private performWinner(winnerStatus: RaceWinnerStatus) {
        const winner = this.participants[winnerStatus.index];

        if (!winner) {
            throw new RangeError(`Race winner index ${winnerStatus.index} is outside of range.`);
        }

        // Cancel all other participants
        for (const [i, participant] of this.participants.entries()) {
            if (i === winnerStatus.index) {
                continue;
            }

            // cancel does not throw
            participant.cancel();
        }

        if (!winnerStatus.ok) {
            throw winnerStatus.error;
        }

        winner.proceed();
    }

    private findReadyParticipant(): RaceWinnerStatus | undefined {
        for (const [index, participant] of this.participants.entries()) {
            try {
                if (participant.isReady()) {
                    return {ok: true, index};
                }
            } catch (error) {
                return {ok: false, index, error};
            }
        }

        return undefined;
    }
}
