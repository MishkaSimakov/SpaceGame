export function ok(value: unknown, message?: string): asserts value {
    if (!value) {
        throw message || "Assertion failed";
    }
}

export function equal(actual: unknown, expected: unknown, message?: string): void {
    if (actual != expected) {
        throw message || `Assertion failed: ${actual} == ${expected} evaluated to false`;
    }
}

export function strictEqual(actual: unknown, expected: unknown, message?: string): void {
    if (actual != expected) {
        throw message || `Assertion failed: ${actual} === ${expected} evaluated to false`;
    }
}