import Scene from "./Scene";
import Pointer from "./Pointer";
import EventsManager from "./EventsManager";
import Color from "./types/Color";
import Game from "../../Game";

type GraphicsManagerEvents = 'pointerdown' | 'pointerup' | 'pointermove' | 'ready';

class GraphicsManager {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;

    width: number;
    height: number;

    backgroundColor: Color = Color.BLACK;

    isDry: boolean = false;
    fps: number = 60;

    scenes: Scene[] = [];

    pointer: Pointer;
    events: EventsManager<GraphicsManagerEvents>;

    constructor(canvasId: string) {
        // TODO: fix error when DOM loaded faster!!!

        this.events = new EventsManager<GraphicsManagerEvents>();
        this.pointer = new Pointer(this.events);

        document.addEventListener('DOMContentLoaded', async () => {
            await this.loadFonts();

            this.width = window.innerWidth;
            this.height = window.innerHeight;

            this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;

            this.canvas.setAttribute('width', this.width.toString());
            this.canvas.setAttribute('height', this.height.toString());

            this.context = this.canvas.getContext('2d');

            setInterval(() => {
                if (this.isDry) {
                    this.redraw();
                    this.isDry = false;
                }
            }, 1000 / this.fps);

            this.events.emit('ready');
        });
    }

    async loadFonts() {
        async function loadFont(name, url): Promise<FontFace> {
            return new Promise((resolve, reject) => {
                let newFont = new FontFace(name, `url(${url})`);
                newFont.load().then((loaded) => {
                    document.fonts.add(loaded);

                    resolve(loaded);
                }).catch(reject);
            });
        }

        await Promise.all([
            loadFont("Exo2Bold", "/fonts/Exo2-Bold.ttf"),
            loadFont("Exo2Regular", "/fonts/Exo2-Regular.ttf")
        ]);
    }

    addScene<Type extends Scene>(sceneConstructor: (new (...args: any[]) => Type), ...args): Type {
        let scene = new sceneConstructor(this, ...args);

        this.scenes.push(scene);

        return scene;
    }

    requestRedraw() {
        this.isDry = true;
    }

    redraw() {
        this.context.fillStyle = this.backgroundColor.toSting();
        this.context.fillRect(0, 0, this.width, this.height);

        for (let scene of this.scenes) {
            scene.redraw();
        }
    }
}

export {GraphicsManagerEvents, GraphicsManager};
