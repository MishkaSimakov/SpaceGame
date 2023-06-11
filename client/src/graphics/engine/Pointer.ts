import EventsManager from "./EventsManager";
import {GraphicsManagerEvents} from "./GraphicsManager";

export default class Pointer {
    graphicsManagerEvents: EventsManager<GraphicsManagerEvents>;

    x: number;
    y: number;

    prevX: number;
    prevY: number;

    isDown: boolean = false;

    constructor(graphicsManagerEvents: EventsManager<GraphicsManagerEvents>) {
        this.graphicsManagerEvents = graphicsManagerEvents;

        document.addEventListener('pointermove', (event: PointerEvent) => {
            this.prevX = this.x;
            this.prevY = this.y;

            this.graphicsManagerEvents.emit('pointermove', this);

            this.x = event.x;
            this.y = event.y;
        });

        document.addEventListener('pointerdown', () => {
            this.isDown = true;

            this.graphicsManagerEvents.emit('pointerdown', this);
        });

        document.addEventListener('pointerup', () => {
            this.isDown = false;

            this.graphicsManagerEvents.emit('pointerup', this);
        });
    }
}
