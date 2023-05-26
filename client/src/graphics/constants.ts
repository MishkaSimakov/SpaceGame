type ButtonColors = { DISABLED: number, DEFAULT: number, HOVER: number, ACTIVE: number };

const COLORS = {
    BACKGROUND: 0x20202A,
    STROKE: 0x474E68,
    BUTTON: {
        PRIMARY: {
            DISABLED: 0x9A9AFE,
            DEFAULT: 0x4343FE,
            HOVER: 0x0B0BFE,
            ACTIVE: 0x0101A2,
        },
        DANGER: {
            DISABLED: 0xFF7070,
            DEFAULT: 0xFF2525,
            HOVER: 0xE00000,
            ACTIVE: 0xA30000,
        }
    },
    TEXT: 0xFFFFFF,
};

let SIZES = {
    STROKE_WIDTH: 5,
    CORNER_RADIUS: 10,
};

export {COLORS, SIZES, ButtonColors};