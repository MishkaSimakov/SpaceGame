import {OtherPlayer} from "@common/GameForPlayerDTO";
import {ModuleCard, PlayerId, Vector2} from "@common/Types";

import Game from "../../Game";
import Scene from "../engine/Scene";
import Color from "../Color";
import {DD} from "../engine/Drag";
import {Spaceship as SpaceshipShape} from "../shapes/Spaceship";
import {CardShape} from "../shapes/CardShape";
import {CountBoundary} from "../CountBoundary";
import {ChooseModuleManager} from "../ChooseModuleManager";

let spaceshipConfigurations: Vector2[][] = [
    [{x: 0, y: 0}],
    [{x: 0, y: 0}, {x: 0, y: -2500}],
    [{x: 0, y: 0}, {x: -1000, y: -1000}, {x: 1000, y: -1000}],
    [{x: 0, y: 0}, {x: 0, y: -1000}, {x: 1000, y: 0}, {x: 1000, y: -1000}],
    [{x: 0, y: 0}, {x: 0, y: -1000}, {x: 1000, y: 0}, {x: 1000, y: -1000}, {x: 500, y: 1500}]
];

export default class Spaceships extends Scene {
    spaceshipShapes: Record<number, SpaceshipShape> = {};
    gameManager: Game;
    spaceshipsCardSize: number;

    activeChooseModule: ChooseModuleManager[] = [];

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

    chooseModules(check: (info: {
        module: ModuleCard,
        player: PlayerId
    }) => boolean, count: CountBoundary, outlineColor: Color) {
        const manager = new ChooseModuleManager(this, check, count, outlineColor);
        manager.activate();

        this.activeChooseModule.push(manager);

        return manager.getHandle();
    }

    updateData(players: OtherPlayer[]) {
        for (let [index, player] of players.entries()) {
            if (this.spaceshipShapes[player.id] === undefined) {
                const spaceshipPosition = spaceshipConfigurations[players.length - 1][index];

                const gameId = window.location.href.split('/').pop();
                this.spaceshipShapes[player.id] = new SpaceshipShape({
                    id: `spaceship.${gameId}.${player.id}`,
                    cardSize: this.spaceshipsCardSize,
                    x: spaceshipPosition.x,
                    y: spaceshipPosition.y,
                });

                this.spaceshipShapes[player.id].spaceship(player.spaceship);

                this.add(this.spaceshipShapes[player.id]);
            } else {
                this.spaceshipShapes[player.id].setSpaceship(player.spaceship);
            }
        }

        this.activeChooseModule.forEach(manager => manager.activate());
    }

    endChoosingModule() {
        this.activeChooseModule = [];

        for (let key in this.spaceshipShapes) {
            for (let shape of this.spaceshipShapes[key].children) {
                (shape as CardShape).strokeWidth(0);
                (shape as CardShape).setState('DEFAULT');

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
