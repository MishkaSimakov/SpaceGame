import {Shape} from "./Shape";
import BoundingBox from "../types/BoundingBox";
import Scene from "../Scene";
import Module from "../../../../../common/modules/Module";
import Rectangle from "./Rectangle";
import Text from "./Text";
import {Event} from "../../../../../common/events/Event";
import Color from "../types/Color";

export default class Card extends Shape {
    card: (Module|Event);
    size: number;

    background: Rectangle;
    text: Text;

    constructor(scene: Scene, x: number, y: number, size: number, card: (Module|Event)) {
        super(scene);

        this.card = card;
        this.x = x;
        this.y = y;
        this.size = size;

        // this.background = this.scene.rect(x, y, size, size);
        //
        this.scene.requestRedraw();
    }

    setStrokeStyle(color: Color, width: number): Card {
        return this;
    }

    contains(x: number, y: number): boolean {
        return this.background.contains(x, y);
    }

    getBounds(): BoundingBox {
        return this.background.getBounds();
    }

    redraw(context: CanvasRenderingContext2D) {
        this.background.redraw(context);
        this.text.redraw(context);
    }
}
