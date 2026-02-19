import {Canvas} from "./Canvas";
import {Shape} from "./Shape";

export abstract class Context extends CanvasRenderingContext2D {
    customCanvas: Canvas;

    constructor(canvas: Canvas) {
        super();

        this.customCanvas = canvas;
    }

    getCanvas() {
        return this.customCanvas;
    }

    clear() {
        let canvas = this.getCanvas();

        this.clearRect(0, 0, canvas.width / canvas.pixelRatio, canvas.height / canvas.pixelRatio);
    }

    fillStrokeShape(shape: Shape) {
        this.fillShape(shape);
        this.strokeShape(shape);
    }

    abstract _fill(shape: Shape);

    abstract _stroke(shape: Shape);

    strokeShape(shape: Shape) {
        if (shape.hasStroke())
            this._stroke(shape);
    }

    fillShape(shape: Shape) {
        this._fill(shape);
    }
}

export class SceneContext extends Context {
    _fill(shape: Shape) {
        this.fillStyle = shape.getFillWithBrightness();

        shape._fillFunc(this);
    }

    _stroke(shape: Shape) {
        this.strokeStyle = shape.getStrokeWithBrightness();
        this.lineWidth = shape.strokeWidth();

        shape._strokeFunc(this);
    }
}

export class HitContext extends Context {
    _fill(shape: Shape) {
        this.fillStyle = shape.colorKey;

        shape._fillFuncHit(this);
    }

    _stroke(shape: Shape) {
        this.strokeStyle = shape.colorKey;
        this.lineWidth = shape.strokeWidth();

        shape._strokeFuncHit(this);
    }
}
