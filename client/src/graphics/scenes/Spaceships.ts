import {PlayerId, Vector2} from "@common/Types";
import {getDistance} from "@common/VectorUtils";

import Game from "../../Game";
import Scene from "../engine/Scene";
import {DD} from "../engine/Drag";
import {Spaceship as SpaceshipShape} from "../shapes/Spaceship";
import {SIZES} from "../constants";

export default class Spaceships extends Scene {
    spaceshipShapes: Record<PlayerId, SpaceshipShape> = {};
    gameManager: Game;
    spaceshipsCardSize: number;

    constructor(game: Game) {
        super({
            originX: -0.5,
            originY: -0.5
        });

        this.gameManager = game;

        const storedPosition = localStorage.getItem(this.getStorageKey());
        if (storedPosition) {
            const [pX, pY, sX, sY] = storedPosition.split(',').map(Number);

            if (Number.isNaN(pX) || Number.isNaN(pY) || Number.isNaN(sX) || Number.isNaN(sY)) {
                localStorage.removeItem(this.getStorageKey());
            } else {
                this.setPosition({x: pX, y: pY}).scaleX(sX).scaleY(sY);
            }
        }
    }

    adopted() {
        this.spaceshipsCardSize = 256 * this.width() / 1440;

        let prevPointerPosition = undefined;
        this.getGraphics().on("mousemove", ({evt}) => {
            let pointerPosition = this.getGraphics().getRelativePointerPosition();

            if (!DD.isDragging() && prevPointerPosition && evt.buttons !== 0) {
                this.move({
                    x: pointerPosition.x - prevPointerPosition.x,
                    y: pointerPosition.y - prevPointerPosition.y
                });
                this.storeState();
            }

            prevPointerPosition = pointerPosition;
        });

        this.getGraphics().on("touchend", () => {
            prevPointerPosition = undefined;

            lastDist = 0;
            lastCenter = null;
        });

        this.getGraphics().on("touchstart", () => {
            prevPointerPosition = undefined;

            lastDist = 0;
            lastCenter = null;
        });

        this.getGraphics().on("wheel", ({evt}) => {
            const deltaY = evt.deltaY;
            const zoom = this.scaleX();
            const pos = this.getRelativePointerPosition();

            const scrollCoefficient = 0.0025;

            const newZoom = Math.min(
                2,
                Math.max(0.1, zoom - deltaY * scrollCoefficient)
            );

            this.move({
                x: pos.x * (zoom - newZoom),
                y: pos.y * (zoom - newZoom)
            });
            this.scaleX(newZoom).scaleY(newZoom);

            this.storeState();
        });

        function getCenter(p1, p2) {
            return {
                x: (p1.x + p2.x) / 2,
                y: (p1.y + p2.y) / 2,
            };
        }

        let lastCenter = undefined;
        let lastDist = 0;

        this.getGraphics().on('touchmove', ({evt}) => {
            evt.preventDefault();

            let touch1 = evt.touches[0];
            let touch2 = evt.touches[1];

            if (touch1 && !touch2) {
                let pointerPosition = this.getGraphics().getRelativePointerPosition();

                if (!DD.isDragging() && prevPointerPosition) {
                    this.move({
                        x: pointerPosition.x - prevPointerPosition.x,
                        y: pointerPosition.y - prevPointerPosition.y
                    });

                    this.storeState();
                }

                prevPointerPosition = pointerPosition;
            }

            if (!touch1 || !touch2) {
                return;
            }

            let p1 = {
                x: touch1.clientX,
                y: touch1.clientY,
            };
            let p2 = {
                x: touch2.clientX,
                y: touch2.clientY
            };

            if (!lastCenter) {
                lastCenter = getCenter(p1, p2);
                return;
            }
            let newCenter = getCenter(p1, p2);

            let dist = getDistance(p1, p2);

            if (!lastDist) {
                lastDist = dist;
            }

            const tr = this.getAbsoluteTransform().copy();
            tr.invert();

            let localPoint = tr.point(newCenter);

            var scale = this.scaleX() * (dist / lastDist);

            let dx = lastCenter.x - newCenter.x;
            let dy = lastCenter.y - newCenter.y;

            this.move({
                x: localPoint.x * (this.scaleX() - scale) - dx,
                y: localPoint.y * (this.scaleY() - scale) - dy
            });

            this.scaleX(scale);
            this.scaleY(scale);

            this.storeState();

            lastDist = dist;
            lastCenter = newCenter;
        });
    }

    panTo(position: Vector2, duration: number = 500) {
        const newPosition = {
            x: -position.x * this.scaleX() - SIZES.CONTROLS_WIDTH / 2,
            y: -position.y * this.scaleY()
        };

        this.storeState(newPosition, {x: this.scaleX(), y: this.scaleY()});

        this.animate(newPosition, duration);
    }

    private storeState(): void;
    private storeState(position: Vector2, scale: Vector2): void;
    private storeState(position: Vector2 | void, scale: Vector2 | void) {
        const p = position ? position : this.getPosition();
        const s = scale ? scale : {x: this.scaleX(), y: this.scaleY()};

        localStorage.setItem(this.getStorageKey(), `${p.x},${p.y},${s.x},${s.y}`);
    }

    private getStorageKey() {
        return `spaceships//${this.gameManager.getGameId()}`;
    }
}
