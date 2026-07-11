function clamp(min: number, value: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export default class Color {
    r: number;
    g: number;
    b: number;
    a: number;

    static BLACK = Color.fromRGBA(0, 0, 0);
    static GREY = Color.fromRGBA(128, 128, 128);
    static LIGHT_GREY = Color.fromRGBA(200, 200, 200);
    static WHITE = Color.fromRGBA(255, 255, 255);
    static YELLOW = Color.fromHex('#ffa42e');

    protected constructor(r: number, g: number, b: number, alpha: number) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = alpha;
    }

    setAlpha(newValue: number): this {
        this.a = newValue;
        return this;
    }

    applyBrightnessFilter(brightness: number): this {
        this.r = clamp(0, this.r * brightness, 255);
        this.g = clamp(0, this.g * brightness, 255);
        this.b = clamp(0, this.b * brightness, 255);

        return this;
    }

    static fromHex(hex: string, alpha: number = 1): Color | undefined {
        const parts = hex.slice(1).match(/.{1,2}/g);

        if (parts === null || parts.length !== 3) {
            return undefined;
        }

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
        ratio = clamp(0, ratio, 1);

        const r = from.r + (to.r - from.r) * ratio;
        const g = from.g + (to.g - from.g) * ratio;
        const b = from.b + (to.b - from.b) * ratio;
        const a = from.a + (to.a - from.a) * ratio;

        return Color.fromRGBA(r, g, b, a);
    }

    static fromString(value: string): Color | undefined {
        if (value.startsWith('rgba(')) {
            value = value.slice(5).slice(0, -1);
            const [r, g, b, a] = value.split(',').map(Number);
            return Color.fromRGBA(r, g, b, a);
        } else if (value.startsWith('#')) {
            return Color.fromHex(value);
        }

        return undefined;
    }

    toString(): string {
        return `rgba(${Math.floor(this.r)}, ${Math.floor(this.g)}, ${Math.floor(this.b)}, ${this.a})`;
    }
}
