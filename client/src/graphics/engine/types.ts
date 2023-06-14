export interface GetSet<Type, This> {
    (): Type;
    (value: Type): This;
}

export interface Vector2 {
    x: number;
    y: number;
}

export class BoundingRect {
    top: number;
    bottom: number;
    left: number;
    right: number;

    constructor(top?: number, left?: number, bottom?: number, right?: number) {
        this.top = top ?? Infinity;
        this.left = left ?? Infinity;
        this.bottom = bottom ?? 0;
        this.right = right ?? 0;
    }

    get width() {
        return this.right - this.left;
    }

    get height() {
        return this.bottom - this.top;
    }
}
