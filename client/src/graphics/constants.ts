import Color from "./Color";

export type ButtonColors = {
    DEFAULT: Color,
    HOVER: Color,
    ACTIVE: Color
};

export const COLORS = {
    BACKGROUND: 0x20202A,
    STROKE: 0x474E68,
    BUTTON: {
        PRIMARY: {
            DISABLED: Color.fromHex('#9A9AFE'),
            DEFAULT: Color.fromHex('#4343FE'),
            HOVER: Color.fromHex('#0B0BFE'),
            ACTIVE: Color.fromHex('#0101A2'),
        },
        DANGER: {
            DISABLED: Color.fromHex('#FF7070'),
            DEFAULT: Color.fromHex('#FF2525'),
            HOVER: Color.fromHex('#E00000'),
            ACTIVE: Color.fromHex('#A30000'),
        }
    },
    TEXT: 0xFFFFFF,
    TEXT_DANGER: Color.fromHex('#FF2525'),
    DANGER_STROKE: Color.fromHex('#e76f51'),
    DEFAULT_STROKE: Color.fromHex('#a3b18a'),
};

export const SIZES = {
    STROKE_WIDTH: 5,
    CORNER_RADIUS: 10,
};
