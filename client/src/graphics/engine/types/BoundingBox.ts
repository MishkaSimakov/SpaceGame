export default class BoundingBox {
    top: number;
    left: number;
    bottom: number;
    right: number;

    width: number;
    height: number;

    constructor(left: number, top: number, width: number, height: number) {
        this.top = top;
        this.left = left;
        this.bottom = top + height;
        this.right = left + width;

        this.width = width;
        this.height = height;
    }

    contains(x: number, y: number): boolean {
        return this.left <= x && x <= this.right
            && this.top <= y && y <= this.bottom;
    }
}
