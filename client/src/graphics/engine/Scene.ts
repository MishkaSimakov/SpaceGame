import {Container} from "./Container";
import {Shape, shapes} from "./Shape";
import {Group} from "./Group";
import {HitCanvas, SceneCanvas} from "./Canvas";
import {Vector2} from "./types";
import {Utils} from "./Utils";
import {_registerNode} from "./Global";
import {SceneShapeFactory} from "./SceneShapeFactory";
import {NodeConfig} from "./Node";

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
                try {
                    this.draw();
                } catch (err) {
                    window["errors"].push(err);
                } finally {
                    this.waitingForDraw = false;
                }
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

    adopted() {
    };
}

Scene.prototype.nodeType = 'Scene';
_registerNode(Scene);
