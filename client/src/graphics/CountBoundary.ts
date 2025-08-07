export enum BoundaryType {
    EQUAL,
    AT_LEAST,
    NO_MORE_THAN
}

export type CountBoundary = {
    type: BoundaryType,
    count: number
}

export type CountBoundaryValidationResult = { verdict: "error", error: string } | { verdict: "correct" };

// convenient constructors
export namespace Boundary {
    export function equal(count: number) {
        return {type: BoundaryType.EQUAL, count};
    }

    export function atLeast(count: number) {
        return {type: BoundaryType.AT_LEAST, count};
    }

    export function noMoreThan(count: number) {
        return {type: BoundaryType.NO_MORE_THAN, count};
    }
}