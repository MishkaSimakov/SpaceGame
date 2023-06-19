import Vector2 from "../../../../common/Vector2";
import Module from "../../../../common/modules/Module";
import Game from "../../Game";
import Scene from "../engine/Scene";
import Color from "../Color";
import {DD} from "../engine/Drag";
import {Spaceship as SpaceshipShape} from "../shapes/Spaceship";
import {Card} from "../shapes/Card";
import {Node} from "../engine/Node";
import {Shape} from "../engine/Shape";

let spaceshipConfigurations: Vector2[][] = [
    [new Vector2(0, 0)],
    [new Vector2(0, 0), new Vector2(0, -2500)],
    [new Vector2(0, 0), new Vector2(-1000, -1000), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000), new Vector2(500, 1500)]
];

export default class Spaceships extends Scene {
    spaceshipShapes: Record<number, SpaceshipShape> = {};

    gameManager: Game;

    spaceshipsCardSize: number;

    constructor(game: Game) {
        super({
            originX: -0.5,
            originY: -0.5
        });

        this.gameManager = game;
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
            let deltaY = evt.deltaY,
                zoom = this.scaleX(),
                newZoom = zoom,
                pos = this.getRelativePointerPosition();

            const scrollCoefficient = 0.0025;

            newZoom = Math.min(
                2,
                Math.max(0.1, zoom - deltaY * scrollCoefficient)
            );

            this.move({
                x: pos.x * (zoom - newZoom),
                y: pos.y * (zoom - newZoom)
            });

            this.scaleX(newZoom).scaleY(newZoom);
        });


        function getDistance(p1, p2) {
            return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        }

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

            lastDist = dist;
            lastCenter = newCenter;
        });
    }

    chooseModule(onSelected: (module?: Module, playerId?: number) => void, check: (module: Module, playerId: number) => boolean, required: boolean, outlineColor: Color): void {
        let selected: Card;

        for (let key in this.spaceshipShapes) {
            let playerId = parseInt(key);

            for (let shape of this.spaceshipShapes[playerId].children) {
                const card = shape as Card;
                const module = card.card() as Module;

                if (!check(module, playerId)) {
                    card.setState('DISABLED');

                    continue;
                }

                card.setState('ENABLED');

                shape.on('click.choosemodule', () => {
                    if (selected !== undefined)
                        selected._background.strokeWidth(0);

                    if (!required && shape === selected) {
                        selected = undefined;
                        onSelected();

                        return;
                    }

                    selected = card;

                    card.moveToTop();
                    selected.strokeWidth(5).stroke(outlineColor.toString());

                    onSelected(module, playerId);
                });
            }
        }
    }

    chooseModules(onSelected: (modules: Module[]) => void, check: (module: Module, playerId: number) => boolean, count: number, outlineColor: Color): void {
        let selected: Card[] = [];

        for (let key in this.spaceshipShapes) {
            let playerId = parseInt(key);
            for (let shape of this.spaceshipShapes[playerId].children) {
                const card = shape as Card;
                const module = card.card() as Module;

                if (!check(module, playerId)) {
                    card.setState('DISABLED');
                    continue;
                }

                card.setState('ENABLED');

                shape.on('click.choosemodule', () => {
                    if (selected.includes(card))
                        return;

                    if (selected.length === count) {
                        selected[selected.length - 1]._background.strokeWidth(0);
                        selected.splice(selected.length - 1, 1);
                    }

                    selected.push(card);
                    card.moveToTop();
                    card.strokeWidth(5).stroke(outlineColor.toString());

                    onSelected(selected.map(s => s.card() as Module));
                });
            }
        }
    }

    updateData() {
        let players = this.gameManager.getAllPlayers();

        for (let [index, player] of players.entries()) {
            if (this.spaceshipShapes[player.id] === undefined) {
                const spaceshipPosition = spaceshipConfigurations[players.length - 1][index];

                this.spaceshipShapes[player.id] = new SpaceshipShape({
                    cardSize: this.spaceshipsCardSize,
                    x: spaceshipPosition.x,
                    y: spaceshipPosition.y,
                });

                this.spaceshipShapes[player.id].spaceship(player.spaceship);

                this.add(this.spaceshipShapes[player.id]);

                if (player.id === this.gameManager.currentPlayer.id) {
                    this.panToPlayerWithId(player.id, 0);
                }
            } else {
                this.spaceshipShapes[player.id].setSpaceship(player.spaceship);
            }
        }
    }

    endChoosingModule() {
        for (let key in this.spaceshipShapes) {
            for (let shape of this.spaceshipShapes[key].children) {
                (shape as Card).strokeWidth(0);
                (shape as Card).setState('DEFAULT');

                shape.off('click.choosemodule');
            }
        }
    }

    panToPlayerWithId(playerId: number, duration: number = 500) {
        let position = this.spaceshipShapes[playerId].getPosition();

        this.animate({
            x: -position.x * this.scaleX(),
            y: -position.y * this.scaleY()
        }, duration);
    }
}
