export default class Color {
    r: number;
    g: number;
    b: number;
    a: number;

    static BLACK = Color.fromRGBA(0, 0, 0);
    static WHITE = Color.fromRGBA(255, 255, 255);
    static YELLOW = Color.fromHex('#ffa42e');

    protected constructor(r: number, g: number, b: number, alpha: number) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = alpha;
    }

    static fromHex(hex: string, alpha: number = 1): Color {
        let parts = hex.slice(1).match(/.{1,2}/g);

        return new Color(
            parseInt(parts[0], 16),
            parseInt(parts[1], 16),
            parseInt(parts[2], 16),
            alpha
        );
    }

    static fromRGBA(r: number, g: number, b: number, alpha: number = 1): Color {
        return new Color(r, g, b, alpha);
    }

    static transparent(): Color {
        return new Color(0, 0, 0, 0);
    }

    static interpolate(from: Color, to: Color, ratio: number): Color {
        if (ratio < 0) {
            ratio = 0;
        }

        if (ratio > 1) {
            ratio = 1;
        }

        const r = Math.round(from.r + (to.r - from.r) * ratio);
        const g = Math.round(from.g + (to.g - from.g) * ratio);
        const b = Math.round(from.b + (to.b - from.b) * ratio);
        const a = Math.round(from.a + (to.a - from.a) * ratio);

        return Color.fromRGBA(r, g, b, a);
    }

    static fromString(value: string): Color {
        if (value.startsWith('rgba(')) {
            value = value.slice(5).slice(0, -1);
            const [r, g, b, a] = value.split(',').map(Number);
            return Color.fromRGBA(r, g, b, a);
        } else if (value.startsWith('#')) {
            return Color.fromHex(value);
        }

        console.error(`Failed to parse color string: ${value}`);
        return Color.BLACK;
    }

    toString(): string {
        return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
    }
}
