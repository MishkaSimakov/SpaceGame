type Milliseconds = number;

export interface IClock {
    // returns the number of milliseconds
    getTime(): Milliseconds;

    // executes `callback` after `timeout` milliseconds
    setTimeout(timeout: Milliseconds, callback: () => void): void;
}