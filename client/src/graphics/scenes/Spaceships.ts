import Vector2 from "@common/Vector2";
import Module from "@common/modules/Module";
import {OtherPlayer} from "@common/GameForPlayerDTO";
import {PlayerId} from "@common/Player";

import Game from "../../Game";
import Color from "../Color";
import {SpaceshipShape} from "../shapes/Spaceship";
import {CountBoundary} from "../CountBoundary";
import {ChooseModuleManager} from "../ChooseModuleManager";

import {Layer} from "konva/lib/Layer";
import HandDrawer from "../HandDrawer";

let spaceshipConfigurations: Vector2[][] = [
    [new Vector2(0, 0)],
    [new Vector2(0, 0), new Vector2(0, -2500)],
    [new Vector2(0, 0), new Vector2(-1000, -1000), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000), new Vector2(500, 1500)]
];

export default class Spaceships extends Layer {
    gameManager: Game;

    spaceshipShapes: Record<PlayerId, SpaceshipShape> = {};
    spaceshipsCardSize: number;
    activeChooseModule: ChooseModuleManager[] = [];

    handDrawer: HandDrawer;

    isRebuildingSpaceship: boolean = false;

    constructor(game: Game) {
        super({
            originX: -0.5,
            originY: -0.5
        });

        this.gameManager = game;

        this.handDrawer = new HandDrawer(game, this);
    }

    registerEvents() {
        this.spaceshipsCardSize = 256 * this.width() / 1440;

        let prevPointerPosition = undefined;
        this.getStage().on("mousemove", ({evt}) => {
            let pointerPosition = this.getRelativePointerPosition();

            // TODO: isDragging
            if (prevPointerPosition && evt.buttons !== 0) {
                this.move({
                    x: pointerPosition.x - prevPointerPosition.x,
                    y: pointerPosition.y - prevPointerPosition.y
                });
            }

            prevPointerPosition = pointerPosition;
        });

        this.getStage().on("touchend", () => {
            prevPointerPosition = undefined;

            lastDist = 0;
            lastCenter = null;
        });

        this.getStage().on("touchstart", () => {
            prevPointerPosition = undefined;

            lastDist = 0;
            lastCenter = null;
        });

        this.getStage().on("wheel", ({evt}) => {
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

        this.getStage().on('touchmove', ({evt}) => {
            evt.preventDefault();

            let touch1 = evt.touches[0];
            let touch2 = evt.touches[1];

            if (touch1 && !touch2) {
                let pointerPosition = this.getRelativePointerPosition();

                // TODO: isDragging
                if (prevPointerPosition) {
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
        module: Module,
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
                    key: `spaceship.${gameId}.${player.id}`,
                    cardSize: this.spaceshipsCardSize,
                    spaceship: player.spaceship,
                    x: spaceshipPosition.x,
                    y: spaceshipPosition.y
                });

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
            for (let shape of this.spaceshipShapes[key].getModules()) {
                shape.setStrokeWidth(0);
                // TODO: uncomment
                // shape.setState('DEFAULT');

                shape.off('click.choosemodule');
            }
        }
    }

    panToPlayerWithId(playerId: number, duration: number = 500) {
        const newPosition = this.spaceshipShapes[playerId].getPosition();

        this.to({
            x: newPosition.x,
            y: newPosition.y,
            duration
        })
    }

    // rebuild spaceship
    setIsRebuildSpaceshipAllowed(allowed: boolean): void {
        this.isRebuildingSpaceship = allowed;

        this.spaceshipShapes[this.gameManager.currentPlayer.id].setModulesDraggable(allowed);
        this.handDrawer.setDragEnabled(allowed);

        this.removeEvents();
        if (allowed) {
            this.addEvents();
        }
    }

    protected addEvents() {
        // for (let shape of spaceshipShape.getModules()) {
        //     const module = shape.module;
        //
        //     if (isMainModule(module))
        //         continue;
        //
        //     shape.on('click.rebuild', () => {
        //         const initRotation = module.rotation;
        //         SpaceshipModifiers.removeModule(this.spaceship, module);
        //
        //         const possibleRotations = SpaceshipGetters.getPossibleRotationsFor(this.spaceship, module, module.x, module.y);
        //
        //         let index = possibleRotations.indexOf(initRotation);
        //         index = (index + 1) % possibleRotations.length;
        //
        //         module.rotation = possibleRotations[index];
        //
        //         if (SpaceshipModifiers.addModule(this.spaceship, module, module.x, module.y)) {
        //             shape.rotateCard(module.rotation * (Math.PI / 2));
        //         } else {
        //             // something really went wrong
        //             module.rotation = initRotation;
        //
        //             // last hope
        //             SpaceshipModifiers.addModule(this.spaceship, module, module.x, module.y);
        //         }
        //     });
        //
        //     shape.on('dragstart.rebuild', () => {
        //         shape.moveToTop();
        //     });
        //
        //     shape.on('dragend.rebuild', () => {
        //         let localPosition = this.spaceshipShape.transformToCardPosition(
        //             new Vector2(this.spaceshipShape.getRelativePointerPosition())
        //         );
        //
        //         SpaceshipModifiers.removeModule(this.spaceship, module.x, module.y);
        //
        //         // try possible rotations
        //         let canConnect = SpaceshipGetters.canConnectModule(this.spaceship, module, localPosition.x, localPosition.y);
        //
        //         if (!canConnect) {
        //             const possibleRotations = SpaceshipGetters.getPossibleRotationsFor(
        //                 this.spaceship, module, localPosition.x, localPosition.y
        //             );
        //
        //             if (possibleRotations.length) {
        //                 module.rotation = possibleRotations[0];
        //                 shape.rotation(module.rotation * Math.PI / 2);
        //                 canConnect = true;
        //             }
        //         }
        //
        //         if (canConnect) {
        //             SpaceshipModifiers.addModule(this.spaceship, module, localPosition.x, localPosition.y);
        //
        //             shape.setPosition({
        //                 x: localPosition.x * spaceshipCardSize,
        //                 y: localPosition.y * spaceshipCardSize
        //             });
        //
        //             let unconnected = SpaceshipGetters.getUnconnectedModules(this.spaceship);
        //             SpaceshipModifiers.removeModule(this.spaceship, unconnected);
        //
        //             this.spaceshipShape.setSpaceship(this.spaceship);
        //
        //             this.hand.push(...unconnected);
        //
        //             this.handDrawer.setHandData(this.hand);
        //             this.handDrawer.redraw();
        //
        //             this.setIsRebuildSpaceshipAllowed(true);
        //
        //             return;
        //         }
        //
        //         // remove from spaceship modules
        //         // remove from spaceship shapes
        //
        //         // find modules that become unconnected to main module
        //         let unconnected = SpaceshipGetters.getUnconnectedModules(this.spaceship);
        //         SpaceshipModifiers.removeModule(this.spaceship, unconnected);
        //
        //         this.spaceshipShape.setSpaceship(this.spaceship);
        //
        //         // add to hand cards
        //         this.hand.push(module, ...unconnected);
        //
        //         // add to hand shapes
        //         this.handDrawer.setHandData(this.hand);
        //         this.handDrawer.redraw();
        //
        //         this.setIsRebuildSpaceshipAllowed(true);
        //     });
        // }

        // for (let shape of this.handDrawer.cardShapes) {
        //     if (shape.isEvent)
        //         continue;
        //
        //     let module = shape.card() as Module;
        //     let dragStartPos;
        //
        //     shape.on('dragstart.rebuild', () => {
        //         shape.moveToTop();
        //
        //         dragStartPos = this.getRelativePointerPosition();
        //     });
        //
        //     shape.on('dragend.rebuild', () => {
        //         let localPosition = this.spaceshipShape.transformToCardPosition(
        //             new Vector2(this.spaceshipShape.getRelativePointerPosition())
        //         );
        //
        //         // try possible rotations
        //         let canConnect = SpaceshipGetters.canConnectModule(this.spaceship, module, localPosition.x, localPosition.y);
        //
        //         if (!canConnect) {
        //             const possibleRotations = SpaceshipGetters.getPossibleRotationsFor(
        //                 this.spaceship, module, localPosition.x, localPosition.y
        //             );
        //
        //             if (possibleRotations.length) {
        //                 module.rotation = possibleRotations[0];
        //                 shape.rotation(module.rotation * Math.PI / 2);
        //                 canConnect = true;
        //             }
        //         }
        //
        //         if (canConnect) {
        //             SpaceshipModifiers.addModule(this.spaceship, module, localPosition.x, localPosition.y);
        //
        //             // remove from hand cards
        //             this.hand.splice(this.hand.indexOf(module), 1);
        //
        //             // add to spaceship modules
        //             // add to spaceship shapes
        //             this.setSpaceship(this.spaceship);
        //
        //             // redraw hand
        //             this.handDrawer.setHandData(this.hand);
        //             this.handDrawer.redraw();
        //
        //             this.setIsRebuildSpaceshipAllowed(true);
        //
        //             return;
        //         }
        //
        //         // TODO:
        //         // let {startPos} = DD._dragElements.get(shape._id);
        //         //
        //         // if (!startPos)
        //         //     return;
        //         //
        //         // shape.setPosition(startPos);
        //     });
        // }
    }

    protected removeEvents() {
        for (let shape of this.currentPlayerSpaceshipShape.getModules()) {
            shape.off('.rebuild');
        }

        for (let shape of this.handDrawer.cardShapes) {
            shape.off('.rebuild');
        }
    }

    protected get currentPlayerSpaceship() {
        return this.gameManager.currentPlayer.spaceship;
    }

    protected get currentPlayerSpaceshipShape() {
        return this.spaceshipShapes[this.gameManager.currentPlayer.id];
    }
}
