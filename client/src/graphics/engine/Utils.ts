import {Context} from "./Context";

export const Utils = {
    isFunction(obj: any): boolean {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    },
    isObject(val: any): val is Object {
        return val instanceof Object;
    },
    capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    createCanvasElement(): HTMLCanvasElement {
        return document.createElement('canvas');
    },
    releaseCanvas(canvas: HTMLCanvasElement) {
        canvas.width = 0;
        canvas.height = 0;
    },
    getFirstPointerId(evt) {
        if (!evt.touches) {
            return evt.pointerId || 999;
        } else {
            return evt.changedTouches[0].identifier;
        }
    },
    randomColor() {
        let randColor = ((Math.random() * 0xffffff) << 0).toString(16);
        while (randColor.length < 6) {
            randColor = '0' + randColor;
        }
        return '#' + randColor;
    },
    rgbToHex(r: number, g: number, b: number) {
        return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },
    assign<T, U>(target: T, source: U) {
        for (var key in source) {
            (<any>target)[key] = source[key];
        }
        return target as T & U;
    },
    drawRoundedRectPath(context: Context, width: number, height: number, cornerRadius: number | number[]) {
        let topLeft = 0;
        let topRight = 0;
        let bottomLeft = 0;
        let bottomRight = 0;
        if (typeof cornerRadius === 'number') {
            topLeft = topRight = bottomLeft = bottomRight = Math.min(
                cornerRadius,
                width / 2,
                height / 2
            );
        } else {
            topLeft = Math.min(cornerRadius[0] || 0, width / 2, height / 2);
            topRight = Math.min(cornerRadius[1] || 0, width / 2, height / 2);
            bottomRight = Math.min(cornerRadius[2] || 0, width / 2, height / 2);
            bottomLeft = Math.min(cornerRadius[3] || 0, width / 2, height / 2);
        }
        context.moveTo(topLeft, 0);
        context.lineTo(width - topRight, 0);
        context.arc(
            width - topRight,
            topRight,
            topRight,
            (Math.PI * 3) / 2,
            0,
            false
        );
        context.lineTo(width, height - bottomRight);
        context.arc(
            width - bottomRight,
            height - bottomRight,
            bottomRight,
            0,
            Math.PI / 2,
            false
        );
        context.lineTo(bottomLeft, height);
        context.arc(
            bottomLeft,
            height - bottomLeft,
            bottomLeft,
            Math.PI / 2,
            Math.PI,
            false
        );
        context.lineTo(0, topLeft);
        context.arc(topLeft, topLeft, topLeft, Math.PI, (Math.PI * 3) / 2, false);
    }
}
