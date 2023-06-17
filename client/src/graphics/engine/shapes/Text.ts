import {Shape, ShapeConfig} from "../Shape";
import {GetSet} from "../types";
import {Factory} from "../Factory";
import {Utils} from "../Utils";
import {Context} from "../Context";
import {_registerNode} from "../Global";

export interface TextConfig extends ShapeConfig {
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
    align?: string;
}

function _fillFunc(context: Context) {
    context.fillText(this._partialText, this._partialTextX, this._partialTextY);
}

function _strokeFunc(context: Context) {
    context.miterLimit = 2;
    context.strokeText(this._partialText, this._partialTextX, this._partialTextY);
}

let dummyContext: CanvasRenderingContext2D;

function getDummyContext() {
    if (dummyContext)
        return dummyContext;

    dummyContext = Utils.createCanvasElement().getContext('2d') as CanvasRenderingContext2D;

    return dummyContext;
}

export class Text extends Shape {
    textArr: Array<{ text: string, width: number }> = [];
    textHeight: number;
    textWidth: number;

    _partialText: string;
    _partialTextX: number = 0;
    _partialTextY: number = 0;


    constructor(config?: TextConfig) {
        super(config);

        let recalculateWhenChange = [
            'text',
            'fontFamily',
            'fontSize',
            'lineHeight',
            'align'
        ];

        for (let attribute of recalculateWhenChange) {
            this.on(attribute + 'Change', this.setTextData);
        }

        this.setTextData();
    }

    _sceneFunc(context: Context) {
        let align = this.align();
        let totalWidth = this.width();
        let fontSize = this.fontSize();
        let lineHeightPx = this.lineHeight() * fontSize;

        let translateY = lineHeightPx / 2;

        context.font = this.getContextFont();
        context.textBaseline = 'middle';
        context.textAlign = 'left';

        for (let line of this.textArr) {
            if (align === 'center') {
                this._partialTextX = (totalWidth - line.width) / 2;
            } else if (align === 'right') {
                this._partialTextX = totalWidth - line.width;
            }

            this._partialTextY = translateY;
            this._partialText = line.text;

            context.fillStrokeShape(this);

            translateY += lineHeightPx;
        }
    }

    _hitFunc(context: Context) {
        context.beginPath();
        context.rect(0, 0, this.width(), this.height());
        context.closePath();
        context.fillStrokeShape(this);
    }

    getContextFont(): string {
        return this.fontSize() + 'px ' + "\"" + this.fontFamily() + "\"";
    }

    measureSize(text: string) {
        let context = getDummyContext();
        context.save();

        context.font = this.getContextFont();

        let measure = context.measureText(text);

        context.restore();

        return {
            width: measure.width,
            height: this.fontSize()
        };
    }

    getTextWidth(text: string): number {
        return getDummyContext().measureText(text).width;
    }

    addTextLine(line: string, width?: number) {
        width = width || this.getTextWidth(line);

        this.textArr.push({
            text: line,
            width: width
        });
    }

    setTextData() {
        let lines = this.text().split('\n');
        let fontSize = this.fontSize();
        let lineHeightPx = this.lineHeight() * fontSize;
        let textWidth = 0;
        let context = getDummyContext();

        this.textArr = [];

        context.save();
        context.font = this.getContextFont();

        for (let line of lines) {
            let lineWidth = this.getTextWidth(line);
            textWidth = Math.max(textWidth, lineWidth);

            this.addTextLine(line, lineWidth);
        }

        this.textHeight = lineHeightPx * lines.length;
        this.textWidth = textWidth;
    }

    setWidth() {
        console.warn('Only auto width supported');
    }

    setHeight() {
        console.warn('Only auto height supported');
    }

    getWidth(): number {
        return this.textWidth;
    }

    getHeight(): number {
        return this.textHeight;
    }

    text: GetSet<string, this>;
    fontFamily: GetSet<string, this>;
    fontSize: GetSet<number, this>;
    lineHeight: GetSet<number, this>;
    align: GetSet<string, this>;
}

Text.prototype.className = 'Text';
_registerNode(Text);

Text.prototype._fillFunc = _fillFunc;
Text.prototype._strokeFunc = _strokeFunc;

Factory.addGetterSetter(Text, 'text', '');
Factory.addGetterSetter(Text, 'fontFamily', 'Arial');
Factory.addGetterSetter(Text, 'fontSize', 12);
Factory.addGetterSetter(Text, 'lineHeight', 1);
Factory.addGetterSetter(Text, 'align', 'left');
