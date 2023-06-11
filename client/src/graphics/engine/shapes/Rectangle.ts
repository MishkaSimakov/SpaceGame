import Scene from "../Scene";
import {Shape} from "./Shape";
import Color from "../types/Color";
import BoundingBox from "../types/BoundingBox";
import CornerRadiusStyle from "../types/CornerRadiusStyle";
import Vector2 from "../../../../../common/Vector2";

export default class Rectangle extends Shape {
    x: number;
    y: number;
    width: number;
    height: number;

    originX: number = 0;
    originY: number = 0;

    fillColor: Color = Color.BLACK;

    strokeColor: Color = Color.BLACK;
    strokeWidth: number = 0;

    cornerRadius: CornerRadiusStyle = {
        tr: 0,
        tl: 0,
        bl: 0,
        br: 0
    };

    constructor(scene: Scene, x: number, y: number, width: number, height: number) {
        super(scene);

        this.scene = scene;

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.scene.requestRedraw();
    }

    setSize(width: number, height: number): Rectangle {
        this.width = width;
        this.height = height;

        this.scene.requestRedraw();

        return this;
    }

    setFillStyle(color: Color): Rectangle {
        this.fillColor = color;

        this.scene.requestRedraw();

        return this;
    }

    setStrokeStyle(color: Color, width: number): Rectangle {
        this.strokeColor = color;
        this.strokeWidth = width;

        this.scene.requestRedraw();

        return this;
    }

    setCornerRadius(radius: number): Rectangle;
    setCornerRadius(radius: CornerRadiusStyle): Rectangle;
    setCornerRadius(radius: number | CornerRadiusStyle): Rectangle {
        if (typeof radius === 'number') {
            this.cornerRadius = {
                tl: radius,
                tr: radius,
                bl: radius,
                br: radius
            };
        } else {
            this.cornerRadius = radius;
        }

        this.scene.requestRedraw();

        return this;
    }

    contains(x: number, y: number): boolean {
        return this.getBounds().contains(x, y);
    }

    getBounds(): BoundingBox {
        let position = this.applyContainerOffset(new Vector2(this.x, this.y));

        return new BoundingBox(position.x, position.y, this.width, this.height);
    }

    redraw(context: CanvasRenderingContext2D) {
        let position = this.getScenePosition();
        position = this.scene.toScreenPosition(position.x, position.y);

        context.beginPath();

        context.fillStyle = this.fillColor.toSting();
        context.strokeStyle = this.strokeColor.toSting();
        context.lineWidth = this.strokeWidth;

        context.roundRect(
            position.x,
            position.y,
            this.width, this.height,
            [this.cornerRadius.tl, this.cornerRadius.tr, this.cornerRadius.br, this.cornerRadius.bl]
        );
        context.fill();

        if (this.strokeWidth !== 0)
            context.stroke();
    }
}
