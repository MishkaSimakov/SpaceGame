import {Container} from "./Container";
import {Shape, shapes} from "./Shape";
import {Group} from "./Group";
import {HitCanvas, SceneCanvas} from "./Canvas";
import {GetSet, Vector2} from "./types";
import {Utils} from "./Utils";
import {_registerNode} from "./Global";
import {SceneShapeFactory} from "./SceneShapeFactory";
import {NodeConfig} from "./Node";
import {Factory} from "./Factory";

export default class Scene extends Container<Group | Shape> {
    canvas = new SceneCanvas({
        width: 0,
        height: 0
    });
    hitCanvas = new HitCanvas({
        width: 0,
        height: 0
    });

    waitingForDraw: boolean = false;
    createAndAdd: SceneShapeFactory;

    panning = false;

    constructor(config?: NodeConfig) {
        super(config);

        this.createAndAdd = new SceneShapeFactory(this);
    }

    setSize({width, height}) {
        this.canvas.setSize(width, height);
        this.hitCanvas.setSize(width, height);

        this.width(width).height(height)

        return this;
    }

    getScene(): Scene {
        return this;
    }

    batchDraw() {
        if (!this.waitingForDraw) {
            this.waitingForDraw = true;

            requestAnimationFrame(() => {
                this.draw();
                this.waitingForDraw = false;
            });
        }
    }

    drawHit() {
        this.hitCanvas.getContext().clear();

        Container.prototype.drawHit.call(this);
    }

    drawScene() {
        this.canvas.getContext().clear();

        Container.prototype.drawScene.call(this);
    }

    getIntersection(pos: Vector2): Shape {
        if (!pos)
            return;

        const ratio = this.hitCanvas.pixelRatio;
        const p = this.hitCanvas.context.getImageData(
            Math.round(pos.x * ratio),
            Math.round(pos.y * ratio),
            1,
            1
        ).data;

        if (p[3] > 0) {
            const colorKey = '#' + Utils.rgbToHex(p[0], p[1], p[2]);

            return shapes[colorKey];
        }
    }

    panTo(x: number, y: number, duration: number) {
        if (this.panning)
            return;

        this.panning = true;

        const animationStart = new Date().getTime();
        const startPosition = this.getPosition();

        x = -x * this.scaleX();
        y = -y * this.scaleY();

        const panFunction = function easeInOutSine(x: number): number {
            return -(Math.cos(Math.PI * x) - 1) / 2;
        }

        const makeAnimationStep = () => {
            requestAnimationFrame(() => {
                let currentTime = new Date().getTime();
                let shouldStop = (currentTime - animationStart) >= duration

                let percent = panFunction((currentTime - animationStart) / duration);

                // TODO: make this better
                // TODO: dont work with zooooom
                if (shouldStop) {
                    this.setPosition({ x: x, y: y });
                } else {
                    this.setPosition({
                        x: x * percent + startPosition.x * (1 - percent),
                        y: y * percent + startPosition.y * (1 - percent)
                    });
                }

                this.waitingForDraw = false;
                this.draw();

                if (!shouldStop) {
                    makeAnimationStep();
                } else {
                    this.panning = false;
                }
            });
        }

        makeAnimationStep();
    }

    adopted() {};
}

Scene.prototype.nodeType = 'Scene';
_registerNode(Scene);
