import Scene from "../Scene";
import Color from "../types/Color";
import {Shape} from "./Shape";
import Vector2 from "../../../../../common/Vector2";
import BoundingBox from "../types/BoundingBox";

export default class Text extends Shape {
    x: number;
    y: number;
    text: string;

    originX: number = 0;
    originY: number = 0;

    fillColor: Color = Color.BLACK;

    fontSize: string = '48px';
    fontFamily: string = 'Exo2Regular';

    constructor(scene: Scene, x: number, y: number, text: string) {
        super(scene);

        this.x = x;
        this.y = y;
        this.text = text;

        this.scene.requestRedraw();
    }

    setText(text: string): Text {
        this.text = text;

        this.scene.requestRedraw();

        return this;
    }

    setFontFamily(fontFamily: string): Text {
        this.fontFamily = fontFamily;

        this.scene.requestRedraw();

        return this;
    }

    setFontSize(fontSize: string);
    setFontSize(fontSize: number);
    setFontSize(fontSize: string | number): Text {
        if (typeof fontSize === 'number') {
            this.fontSize = fontSize + 'px';
        } else {
            this.fontSize = fontSize;
        }

        this.scene.requestRedraw();

        return this;
    }

    setFillStyle(color: Color): Text {
        this.fillColor = color;

        this.scene.requestRedraw();

        return this;
    }

    contains(x: number, y: number): boolean {
        return this.getBounds().contains(x, y);
    }

    redraw(context: CanvasRenderingContext2D) {
        context.fillStyle = this.fillColor.toSting();
        context.font = this.getFontString();

        let position = this.getScenePosition();

        position.y += this.getBounds().height;

        position = this.scene.toScreenPosition(position.x, position.y);

        context.fillText(this.text, position.x, position.y);
    }

    getBounds(): BoundingBox {
        let position = this.applyContainerOffset(new Vector2(this.x, this.y));
        let size = this.measureSize();

        return new BoundingBox(position.x, position.y, size.x, size.y);
    }

    private getFontString(): string {
        return this.fontSize + "  " + this.fontFamily;
    }

    private measureSize(): Vector2 {
        let canvas = document.createElement('canvas');
        canvas.setAttribute('visible', 'none');

        canvas = document.body.appendChild(canvas);
        let ctx = canvas.getContext('2d', {willReadFrequently: true});

        ctx.font = this.getFontString();
        let metrics = ctx.measureText(this.text);

        let width = Math.ceil(metrics.width);
        let baseline = width;
        let height = width * 2;

        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = '#f00';
        ctx.fillRect(0, 0, width, height);

        ctx.font = this.getFontString();
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#000';

        ctx.fillText(this.text, 0, baseline);

        let imageData = ctx.getImageData(0, 0, width, height);

        let pixels = imageData.data;
        let numPixels = pixels.length;
        let line = width * 4;
        let i;
        let j;
        let idx = 0;
        let stop = false;

        for (i = 0; i < baseline; i++) {
            for (j = 0; j < line; j += 4) {
                if (pixels[idx + j] !== 255) {
                    stop = true;
                    break;
                }
            }

            if (!stop) {
                idx += line;
            } else {
                break;
            }
        }

        let top = i;

        idx = numPixels - line;
        stop = false;

        for (i = height; i > baseline; i--) {
            for (j = 0; j < line; j += 4) {
                if (pixels[idx + j] !== 255) {
                    stop = true;
                    break;
                }
            }

            if (!stop) {
                idx -= line;
            } else {
                break;
            }
        }

        let bottom = i;

        document.body.removeChild(canvas);

        return new Vector2(
            width,
            bottom - top
        );
    }
}
