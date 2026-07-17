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
export const Boundary = {
    equal(count: number) {
        return {type: BoundaryType.EQUAL, count};
    },
    atLeast(count: number) {
        return {type: BoundaryType.AT_LEAST, count};
    },
    noMoreThan(count: number) {
        return {type: BoundaryType.NO_MORE_THAN, count};
    },
};
