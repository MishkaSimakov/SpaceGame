import {Shape} from "./Shape";
import BoundingBox from "../types/BoundingBox";
import Scene from "../Scene";

export default class Container extends Shape {
    shapes: Shape[] = [];

    constructor(scene: Scene) {
        super(scene);
    }

    add(shape: Shape): Shape {
        shape.removeFromScene();
        shape.setContainer(this);

        this.shapes.push(shape);

        this.scene.requestRedraw();

        return shape;
    }

    override setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;

        if (this.shapes)
            this.scene.requestRedraw();

        return this;
    }

    contains(x: number, y: number): boolean {
        return this.getBounds().contains(x, y);
    }

    getBounds(): BoundingBox {
        if (this.shapes.length === 0)
            return new BoundingBox(0, 0, 0, 0);

        let left = Infinity;
        let top = Infinity;
        let right = 0;
        let bottom = 0;

        for (let shape of this.shapes) {
            let bb = shape.getBounds();

            left = Math.min(left, bb.left);
            top = Math.min(top, bb.top);
            right = Math.max(right, bb.right);
            bottom = Math.max(bottom, bb.bottom);
        }

        return new BoundingBox(left, top, right - left, bottom - top);
    }

    redraw(context: CanvasRenderingContext2D) {
        this.shapes.sort(Scene.compareByDepth);

        for (let shape of this.shapes) {
            shape.redraw(context);
        }
    }
}
