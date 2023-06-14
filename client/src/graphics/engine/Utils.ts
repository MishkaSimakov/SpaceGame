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
}
