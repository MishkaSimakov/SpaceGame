function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

const COLORS = {
    BACKGROUND: 0x20202A,
    STROKE: 0x474E68,
    BUTTON: {
        PRIMARY: {
            DEFAULT: 0x8181FF,
            HOVER: 0x6363FF,
            ACTIVE: 0x4343FE,
        },
        DANGER: {
            DEFAULT: 0xFF7272,
            HOVER: 0xFF5959,
            ACTIVE: 0xFF2525,
        }
    },
    TEXT: 0xFFFFFF,
};

let SIZES = {
    STROKE_WIDTH: 5,
    CORNER_RADIUS: 10,
};

export {COLORS, SIZES, clamp};