import Module from "./modules/Module";

export default class Vector2 {
    x: number;
    y: number;

    constructor(x: number, y: number);
    constructor(obj: { x: number, y: number });
    constructor(x: number | { x: number, y: number }, y?: number) {
        if (typeof x === 'number') {
            this.x = x;
            this.y = y!;
        } else {
            this.x = x.x;
            this.y = x.y;
        }
    }

    add(vector: Vector2): Vector2;
    add(scalar: number): Vector2;
    add(value: Vector2 | number): Vector2 {
        if (typeof value === 'number') {
            this.x += value;
            this.y += value;
        } else {
            this.x += value.x;
            this.y += value.y;
        }

        return this;
    }

    subtract(vector: Vector2): Vector2;
    subtract(scalar: number): Vector2;
    subtract(value: Vector2 | number): Vector2 {
        if (typeof value === 'number') {
            this.x -= value;
            this.y -= value;
        } else {
            this.x -= value.x;
            this.y -= value.y;
        }

        return this;
    }


    multiply(vector: Vector2): Vector2;
    multiply(scalar: number): Vector2;
    multiply(value: Vector2 | number): Vector2 {
        if (typeof value === 'number') {
            this.x *= value;
            this.y *= value;
        } else {
            this.x *= value.x;
            this.y *= value.y;
        }

        return this;
    }

    divide(vector: Vector2): Vector2;
    divide(scalar: number): Vector2;
    divide(value: Vector2 | number): Vector2 {
        if (typeof value === 'number') {
            this.x /= value;
            this.y /= value;
        } else {
            this.x /= value.x;
            this.y /= value.y;
        }

        return this;
    }

    static modulePosition(module: Module | undefined): Vector2 | undefined {
        if (!module) {
            return undefined;
        }

        return new Vector2(module.x, module.y);
    }
}