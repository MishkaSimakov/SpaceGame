import {Node, NodeConfig} from './Node'
import {Context} from "./Context";
import {BoundingRect, GetSet} from "./types";
import {Factory} from "./Factory";
import {Utils} from "./Utils";
import {_registerNode} from "./Global";
import {Container} from "./Container";

export interface ShapeConfig extends NodeConfig {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    sceneFunc?: (context: Context, shape: Shape) => void;
    hitFunc?: (context: Context, shape: Shape) => void;
}

export const shapes: Record<string, Shape> = {};


function _fillFunc(context) {
    context.fill();
}

function _strokeFunc(context) {
    context.stroke();
}

function _fillFuncHit(context) {
    context.fill();
}

function _strokeFuncHit(context) {
    context.stroke();
}

export class Shape<Config extends ShapeConfig = ShapeConfig> extends Node<Config> {
    colorKey: string;

    _fillFunc: (ctx: Context) => void;
    _strokeFunc: (ctx: Context) => void;
    _fillFuncHit: (ctx: Context) => void;
    _strokeFuncHit: (ctx: Context) => void;

    constructor(config?: Config) {
        super(config);

        while (true) {
            this.colorKey = Utils.randomColor();

            if (this.colorKey && !shapes[this.colorKey])
                break;
        }

        shapes[this.colorKey] = this;
    }

    getSceneFunc() {
        return this.attrs.sceneFunc || this['_sceneFunc'];
    }

    getHitFunc() {
        return this.attrs.hitFunc || this['_hitFunc'];
    }

    drawScene() {
        if (!this.isVisible())
            return;

        let context = this.getScene().canvas.getContext();

        let drawFunc = this.sceneFunc();

        if (!drawFunc)
            return;

        context.save();

        let m = this.getAbsoluteTransform().getMatrix();

        context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);

        this.getSceneFunc().call(this, context, this);

        context.restore();
    }

    drawHit() {
        if (!this.shouldDrawHit())
            return;

        let context = this.getScene().hitCanvas.getContext();
        let drawFunc = this.hitFunc() || this.sceneFunc();

        if (!drawFunc)
            return;

        context.save();

        let m = this.getAbsoluteTransform().getMatrix();

        context.transform(m[0], m[1], m[2], m[3], m[4], m[5]);

        drawFunc.call(this, context, this);

        context.restore();
    }

    hasStroke(): boolean {
        return !!(this.strokeWidth() && this.stroke());
    }

    getClientRect(relativeTo?: Container<Node>, ignoreStroke?: boolean): BoundingRect | undefined {
        if (!this.isVisible()) {
            return;
        }

        relativeTo = relativeTo ?? this.getScene();

        let strokeWidth = (this.hasStroke() && !ignoreStroke) && this.strokeWidth();

        let rect = new BoundingRect(
            0, 0,
            this.height() + strokeWidth, this.width() + strokeWidth
        );

        return this.transformedRect(rect, relativeTo);
    }

    destroy() {
        Node.prototype.destroy.call(this);

        delete shapes[this.colorKey];
        delete this.colorKey;

        return this;
    }

    fill: GetSet<string, this>;
    stroke: GetSet<string, this>;
    strokeWidth: GetSet<number, this>;
    sceneFunc: GetSet<(context: Context, shape: Shape) => void, this>;
    hitFunc: GetSet<(context: Context, shape: Shape) => void, this>;
}

Shape.prototype.nodeType = 'Shape';
_registerNode(Shape)

Shape.prototype._fillFunc = _fillFunc;
Shape.prototype._strokeFunc = _strokeFunc;
Shape.prototype._fillFuncHit = _fillFuncHit;
Shape.prototype._strokeFuncHit = _strokeFuncHit;


Factory.addGetterSetter(Shape, 'fill');
Factory.addGetterSetter(Shape, 'stroke');
Factory.addGetterSetter(Shape, 'strokeWidth', 0);
Factory.addGetterSetter(Shape, 'sceneFunc');
Factory.addGetterSetter(Shape, 'hitFunc');
