import {Utils} from "./Utils";
import {Context, HitContext, SceneContext} from "./Context";

interface ICanvasConfig {
    width?: number;
    height?: number;
    pixelRatio?: number;
    willReadFrequently?: boolean;
}

let _pixelRatio;
function getDevicePixelRatio() {
    if (_pixelRatio) {
        return _pixelRatio;
    }
    var canvas = Utils.createCanvasElement();
    var context = canvas.getContext('2d') as any;
    _pixelRatio = (function () {
        var devicePixelRatio = window.devicePixelRatio || 1,
            backingStoreRatio =
                context.webkitBackingStorePixelRatio ||
                context.mozBackingStorePixelRatio ||
                context.msBackingStorePixelRatio ||
                context.oBackingStorePixelRatio ||
                context.backingStorePixelRatio ||
                1;
        return devicePixelRatio / backingStoreRatio;
    })();
    Utils.releaseCanvas(canvas);
    return _pixelRatio;
}

export class Canvas {
    pixelRatio: number = 1;
    width: number;
    height: number;
    canvas: HTMLCanvasElement;
    context: Context;

    constructor(config: ICanvasConfig) {
        let conf = config || {};

        this.pixelRatio = conf.pixelRatio || getDevicePixelRatio();

        this.canvas = Utils.createCanvasElement();

        this.canvas.style.padding = '0';
        this.canvas.style.margin = '0';
        this.canvas.style.border = '0';
        this.canvas.style.background = 'transparent';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
    }

    setWidth(width: number) {
        this.width = this.canvas.width = width * this.pixelRatio;
        this.canvas.style.width = width + 'px';

        this.context.scale(this.pixelRatio, this.pixelRatio);
    }

    setHeight(height: number) {
        this.height = this.canvas.height = height * this.pixelRatio;
        this.canvas.style.height = height + 'px';

        this.context.scale(this.pixelRatio, this.pixelRatio);
    }

    setSize(width: number, height: number) {
        this.setWidth(width || 0);
        this.setHeight(height || 0);
    }

    getContext(): Context {
        return this.context;
    }
}

export class SceneCanvas extends Canvas {
    constructor(config?: ICanvasConfig) {
        super(config);

        this.context = Object.setPrototypeOf(this.canvas.getContext('2d'), SceneContext.prototype);
        this.context.customCanvas = this;

        this.setSize(config.width, config.height);
    }
}


export class HitCanvas extends Canvas {
    constructor(config?: ICanvasConfig) {
        super(config);

        this.context = Object.setPrototypeOf(this.canvas.getContext('2d', {willReadFrequently: true}), HitContext.prototype);
        this.context.customCanvas = this;

        this.setSize(config.width, config.height);
    }
}
