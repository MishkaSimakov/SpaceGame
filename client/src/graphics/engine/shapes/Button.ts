import {Shape} from "./Shape";
import BoundingBox from "../types/BoundingBox";
import Rectangle from "./Rectangle";
import Text from "./Text";
import Scene from "../Scene";
import {ButtonColors, COLORS} from "../../constants";
import CornerRadiusStyle from "../types/CornerRadiusStyle";

export default class Button extends Shape {
    backgroundShape: Rectangle;
    textShape: Text;

    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    style: ButtonColors = COLORS.BUTTON.PRIMARY;

    disabled: boolean = false;


    constructor(scene: Scene, x: number, y: number, width: number, height: number, text: string) {
        super(scene);

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.text = text;

        this.backgroundShape = scene.rect(this.x, this.y, this.width, this.height);
        this.backgroundShape.removeFromScene()

    }

    setSize(): Button {
        return this;
    }

    setStyle(style: ButtonColors): Button {
        return this;
    }

    setCornerRadius(radius: number);
    setCornerRadius(radius: CornerRadiusStyle);
    setCornerRadius(radius: number | CornerRadiusStyle): Button {
        if (typeof radius === 'number') {
            this.backgroundShape.setCornerRadius(radius);
        } else {
            this.backgroundShape.setCornerRadius(radius);
        }

        this.scene.requestRedraw();

        return this;
    }

    setDisabled(disabled: boolean): Button {
        this.disabled = disabled;

        this.scene.requestRedraw();

        return this;
    }

    contains(x: number, y: number): boolean {
        return this.backgroundShape.contains(x, y);
    }

    getBounds(): BoundingBox {
        return this.backgroundShape.getBounds();
    }

    redraw(context: CanvasRenderingContext2D) {
    }

}
