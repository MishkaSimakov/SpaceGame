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

    toSting(): string {
        return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
    }
}
