import {GraphicsManager, GraphicsManagerEvents} from "./GraphicsManager";
import {Shape, ShapeEvents} from "./shapes/Shape";
import Vector2 from "../../../../common/Vector2";
import Pointer from "./Pointer";
import Rectangle from "./shapes/Rectangle";
import Text from "./shapes/Text";
import Container from "./shapes/Container";
import Module from "../../../../common/modules/Module";
import Card from "./shapes/Card";
import Button from "./shapes/Button";
import {Event} from "../../../../common/events/Event";

export default class Scene {
    graphicsManager: GraphicsManager;

    zoom: number = 1;
    scrollX: number = 0;
    scrollY: number = 0;

    shapes: Shape[] = [];

    constructor(graphicsManager: GraphicsManager) {
        this.graphicsManager = graphicsManager;

        this.graphicsManager.events.on('pointerdown', (pointer: Pointer) => {
            this.passEventToShapes('pointerdown', pointer);
        });

        this.graphicsManager.events.on('pointerup', (pointer: Pointer) => {
            this.passEventToShapes('pointerup', pointer);
        });
    }

    requestRedraw() {
        this.graphicsManager?.requestRedraw();
    }

    redraw() {
        this.graphicsManager.context.scale(this.zoom, this.zoom);

        for (let shape of this.shapes.sort(Scene.compareByDepth)) {
            shape.redraw(this.graphicsManager.context);
        }

        this.graphicsManager.context.scale(1, 1);
    }

    static compareByDepth(a: Shape, b: Shape): number {
        return a.depth - b.depth;
    }

    toScreenPosition(x: number, y: number): Vector2 {
        return new Vector2(
            x + this.scrollX,
            y + this.scrollY
        );
    }

    passEventToShapes(event: GraphicsManagerEvents, pointer: Pointer) {
        for (let shape of this.shapes) {
            if (shape.contains(pointer.x, pointer.y)) {
                shape.events.emit(event as ShapeEvents, pointer);
            }
        }
    }

    rect(x: number, y: number, width: number, height: number): Rectangle {
        let shape = new Rectangle(this, x, y, width, height);

        this.shapes.push(shape);

        return shape;
    }

    text(x: number, y: number, text: string): Text {
        let shape = new Text(this, x, y, text);

        this.shapes.push(shape);

        return shape;
    }

    card(x: number, y: number, size: number, card: (Module | Event)): Card {
        let shape = new Card(this, x, y, size, card);

        this.shapes.push(shape);

        return shape;
    }

    button(x: number, y: number, width: number, height: number, text: string): Button {
        let shape = new Button(this, x, y, width, height, text);

        this.shapes.push(shape);

        return shape;
    }

    container(): Container {
        let shape = new Container(this);

        this.shapes.push(shape);

        return shape;
    }

    get width(): number {
        return this.graphicsManager.width;
    }

    get height(): number {
        return this.graphicsManager.height;
    }
}
