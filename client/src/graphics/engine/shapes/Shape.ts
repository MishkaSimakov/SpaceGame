import EventsManager from "../EventsManager";
import Scene from "../Scene";
import BoundingBox from "../types/BoundingBox";
import Vector2 from "../../../../../common/Vector2";
import Container from "./Container";


type ShapeEvents = 'pointerdown' | 'pointerup' | 'click' | 'dragstart' | 'drag' | 'dragend';

abstract class Shape {
    id: number;
    scene: Scene;
    events: EventsManager<ShapeEvents>;

    depth: number = 0;

    originX: number = 0;
    originY: number = 0;

    x: number;
    y: number;

    container: Container;

    private static count: number = 0;

    protected constructor(scene: Scene) {
        this.events = new EventsManager<ShapeEvents>();
        this.scene = scene;

        this.id = Shape.count;
        Shape.count += 1;
    }

    abstract redraw(context: CanvasRenderingContext2D);

    abstract contains(x: number, y: number): boolean;

    abstract getBounds(): BoundingBox;

    getScenePosition(): Vector2 {
        let position = new Vector2(this.x, this.y);

        position = this.applyContainerOffset(position);
        position = this.applyOriginOffset(position);

        return position;
    }

    applyContainerOffset(position: Vector2): Vector2 {
        return new Vector2(
            position.x + (this.container?.x ?? 0),
            position.y + (this.container?.y ?? 0)
        );
    }

    applyOriginOffset(position: Vector2): Vector2 {
        let bb = this.getBounds();

        return new Vector2(
            position.x - this.originX * bb.width,
            position.y - this.originY * bb.height
        );
    }

    setContainer(container: Container) {
        this.container = container;

        this.scene.requestRedraw();

        return this;
    }

    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;

        this.scene.requestRedraw();

        return this;
    }

    setOrigin(x: number, y: number);
    setOrigin(origin: number);
    setOrigin(x: number, y?: number) {
        this.originX = x;
        this.originY = y ?? x;

        this.scene.requestRedraw();

        return this;
    }

    destroy() {
        if (!this.scene)
            return;

        if (!this.container) {
            this.removeFromScene();
        } else {
            this.removeFromContainer();
        }

        this.scene.requestRedraw();

        this.scene = undefined;
        this.events = undefined;
    }

    removeFromScene() {
        let index = this.scene.shapes.findIndex(shape => shape.id === this.id);

        console.log(this.scene.shapes.map(s => s.id), this.id, this);

        if (index === -1) {
            console.error("Not found in remove from scene!!!");
        }

        this.scene.shapes.splice(index, 1);
    }

    removeFromContainer() {
        if (!this.container)
            return;

        let index = this.container.shapes.findIndex(shape => shape.id === this.id);

        if (index === -1) {
            console.error("Not found in remove from container!!!");
        }

        this.container.shapes.splice(index, 1);
    }

    setDepth(depth: number) {
        this.depth = depth;

        this.scene.requestRedraw();

        return this;
    }
}

export {ShapeEvents, Shape};
