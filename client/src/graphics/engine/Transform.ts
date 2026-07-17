import {Vector2} from "./types";

export class Transform {
    m: Array<number>;
    dirty: boolean = false;

    constructor(m = [1, 0, 0, 1, 0, 0]) {
        this.m = (m && m.slice()) || [1, 0, 0, 1, 0, 0];
    }

    reset() {
        this.m[0] = 1;
        this.m[1] = 0;
        this.m[2] = 0;
        this.m[3] = 1;
        this.m[4] = 0;
        this.m[5] = 0;
    }

    getMatrix(): Array<number> {
        return this.m;
    }

    copyInto(tr: Transform) {
        tr.m[0] = this.m[0];
        tr.m[1] = this.m[1];
        tr.m[2] = this.m[2];
        tr.m[3] = this.m[3];
        tr.m[4] = this.m[4];
        tr.m[5] = this.m[5];
    }

    rotate(rad: number) {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        const m11 = this.m[0] * c + this.m[2] * s;
        const m12 = this.m[1] * c + this.m[3] * s;
        const m21 = this.m[0] * -s + this.m[2] * c;
        const m22 = this.m[1] * -s + this.m[3] * c;
        this.m[0] = m11;
        this.m[1] = m12;
        this.m[2] = m21;
        this.m[3] = m22;
        return this;
    }

    copy(): Transform {
        const tr = new Transform();

        this.copyInto(tr);

        return tr;
    }

    invert() {
        const d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]);
        const m0 = this.m[3] * d;
        const m1 = -this.m[1] * d;
        const m2 = -this.m[2] * d;
        const m3 = this.m[0] * d;
        const m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]);
        const m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
        this.m[0] = m0;
        this.m[1] = m1;
        this.m[2] = m2;
        this.m[3] = m3;
        this.m[4] = m4;
        this.m[5] = m5;
        return this;
    }

    point(point: Vector2) {
        const m = this.m;
        return {
            x: m[0] * point.x + m[2] * point.y + m[4],
            y: m[1] * point.x + m[3] * point.y + m[5],
        };
    }

    vector(vector: Vector2) {
        const m = this.m;
        return {
            x: m[0] * vector.x + m[2] * vector.y,
            y: m[1] * vector.x + m[3] * vector.y,
        };
    }

    multiply(tr: Transform): Transform {
        const matrix = tr.getMatrix();

        const m11 = this.m[0] * matrix[0] + this.m[2] * matrix[1];
        const m12 = this.m[1] * matrix[0] + this.m[3] * matrix[1];

        const m21 = this.m[0] * matrix[2] + this.m[2] * matrix[3];
        const m22 = this.m[1] * matrix[2] + this.m[3] * matrix[3];

        const dx = this.m[0] * matrix[4] + this.m[2] * matrix[5] + this.m[4];
        const dy = this.m[1] * matrix[4] + this.m[3] * matrix[5] + this.m[5];

        this.m[0] = m11;
        this.m[1] = m12;
        this.m[2] = m21;
        this.m[3] = m22;
        this.m[4] = dx;
        this.m[5] = dy;
        return this;
    }

    scale(sx: number, sy: number) {
        this.m[0] *= sx;
        this.m[1] *= sx;
        this.m[2] *= sy;
        this.m[3] *= sy;
        return this;
    }

    translate(x: number, y: number): Transform {
        this.m[4] += this.m[0] * x + this.m[2] * y;
        this.m[5] += this.m[1] * x + this.m[3] * y;

        return this;
    }

    getTranslation(): Vector2 {
        return {
            x: this.m[4],
            y: this.m[5],
        };
    }
}
