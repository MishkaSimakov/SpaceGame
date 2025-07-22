import Spaceships from "./scenes/spaceships";
import Controls from "./scenes/controls";
import Module from "../../../common/modules/Module";
import Spaceship from "../../../common/Spaceship";
import {Event} from "../../../common/events/Event";
import Game from "../Game";
import Player from "../../../common/Player";
import {DD} from "./engine/Drag";
import {Spaceship as SpaceshipShape} from "./shapes/Spaceship";
import {SpaceshipGetters} from "../../../common/getters/Spaceship";
import {SpaceshipModifiers} from "../../../common/modifiers/Spaceship";

export default class RebuildSpaceshipManager {
    gameManager: Game;
    isRebuildingSpaceship: boolean = false;

    constructor(gameManager: Game) {
        this.gameManager = gameManager;
    }

    setIsRebuildSpaceshipAllowed(allowed: boolean): void {
        this.isRebuildingSpaceship = allowed;

        this.spaceshipShape.setModulesDraggable(allowed);
        this.controlsScene.handDrawer.setDragEnabled(allowed);

        this.removeEvents();
        if (allowed) {
            this.addEvents();
        }
    }

    protected addEvents() {
        let spaceshipCardSize = this.spaceshipShape.cardSize();

        for (let shape of this.spaceshipShape.getModules()) {
            const module = shape.card() as Module;

            if (module.isMain)
                continue;

            shape.on('click.rebuild pointerclick.rebuild', () => {
                console.log("click!!!");
                const initRotation = module.rotation;
                SpaceshipModifiers.removeModule(this.spaceship, module);

                const possibleRotations = SpaceshipGetters.getPossibleRotationsFor(this.spaceship, module, module.x, module.y);

                let index = possibleRotations.indexOf(initRotation);
                index = (index + 1) % possibleRotations.length;

                module.rotation = possibleRotations[index];

                if (SpaceshipModifiers.addModule(this.spaceship, module, module.x, module.y)) {
                    shape.rotateCard(module.rotation * (Math.PI / 2));
                } else {
                    // something really went wrong
                    module.rotation = initRotation;

                    // last hope
                    SpaceshipModifiers.addModule(this.spaceship, module, module.x, module.y);
                }
            });

            shape.on('dragstart.rebuild', () => {
                shape.moveToTop();
            });

            shape.on('dragend.rebuild', () => {
                console.log("dragend", this.spaceship);

                let localPosition = this.spaceshipShape.transformToCardPosition(
                    this.spaceshipShape.getRelativePointerPosition()
                );

                SpaceshipModifiers.removeModule(this.spaceship, module.x, module.y);

                // try possible rotations
                let canConnect = SpaceshipGetters.canConnectModule(this.spaceship, module, localPosition.x, localPosition.y);

                if (!canConnect) {
                    const possibleRotations = SpaceshipGetters.getPossibleRotationsFor(
                        this.spaceship, module, localPosition.x, localPosition.y
                    );

                    if (possibleRotations.length) {
                        module.rotation = possibleRotations[0];
                        shape.rotation(module.rotation * Math.PI / 2);
                        canConnect = true;
                    }
                }

                if (canConnect) {
                    SpaceshipModifiers.addModule(this.spaceship, module, localPosition.x, localPosition.y);

                    shape.setPosition({
                        x: localPosition.x * spaceshipCardSize,
                        y: localPosition.y * spaceshipCardSize
                    });

                    let unconnected = SpaceshipGetters.getUnconnectedModules(this.spaceship);
                    SpaceshipModifiers.removeModule(this.spaceship, unconnected);

                    this.spaceshipShape.setSpaceship(this.spaceship);

                    this.hand.push(...unconnected);

                    this.controlsScene.handDrawer.setHandData(this.hand);
                    this.controlsScene.handDrawer.redraw();

                    this.setIsRebuildSpaceshipAllowed(true);

                    return;
                }

                // remove from spaceship modules
                // remove from spaceship shapes

                // find modules that become unconnected to main module
                let unconnected = SpaceshipGetters.getUnconnectedModules(this.spaceship);
                SpaceshipModifiers.removeModule(this.spaceship, unconnected);

                this.spaceshipShape.setSpaceship(this.spaceship);

                // add to hand cards
                this.hand.push(module, ...unconnected);

                // add to hand shapes
                this.controlsScene.handDrawer.setHandData(this.hand);
                this.controlsScene.handDrawer.redraw();

                this.setIsRebuildSpaceshipAllowed(true);
            });
        }

        for (let shape of this.controlsScene.handDrawer.cardShapes) {
            if (shape.isEvent)
                continue;

            let module = shape.card() as Module;
            let dragStartPos;

            shape.on('dragstart.rebuild', () => {
                shape.moveToTop();

                dragStartPos = this.controlsScene.getRelativePointerPosition();
            });

            shape.on('dragend.rebuild', () => {
                console.log("dragend", this.spaceship);

                let localPosition = this.spaceshipShape.transformToCardPosition(
                    this.spaceshipShape.getRelativePointerPosition()
                );

                // try possible rotations
                let canConnect = SpaceshipGetters.canConnectModule(this.spaceship, module, localPosition.x, localPosition.y);

                if (!canConnect) {
                    const possibleRotations = SpaceshipGetters.getPossibleRotationsFor(
                        this.spaceship, module, localPosition.x, localPosition.y
                    );

                    if (possibleRotations.length) {
                        module.rotation = possibleRotations[0];
                        shape.rotation(module.rotation * Math.PI / 2);
                        canConnect = true;
                    }
                }

                if (canConnect) {
                    SpaceshipModifiers.addModule(this.spaceship, module, localPosition.x, localPosition.y);

                    // remove from hand cards
                    this.hand.splice(this.hand.indexOf(module), 1);

                    // add to spaceship modules
                    // add to spaceship shapes
                    this.spaceshipShape.setSpaceship(this.spaceship);

                    // redraw hand
                    this.controlsScene.handDrawer.setHandData(this.hand);
                    this.controlsScene.handDrawer.redraw();

                    this.setIsRebuildSpaceshipAllowed(true);

                    return;
                }

                let {startPos} = DD._dragElements.get(shape._id);

                if (!startPos)
                    return;

                shape.setPosition(startPos);
            });
        }
    }

    protected removeEvents() {
        for (let shape of this.spaceshipShape.getModules()) {
            shape.off('.rebuild');
        }

        for (let shape of this.controlsScene.handDrawer.cardShapes) {
            shape.off('.rebuild');
        }
    }

    private get player(): Player {
        return this.gameManager.currentPlayer;
    }

    private get spaceshipsScene(): Spaceships {
        return this.gameManager.spaceshipsScene;
    }

    private get controlsScene(): Controls {
        return this.gameManager.controlsScene;
    }

    private get spaceshipShape(): SpaceshipShape {
        return this.gameManager.spaceshipsScene.spaceshipShapes[this.player.id];
    }

    private get hand(): (Event | Module)[] {
        return this.player.hand;
    }

    private get spaceship(): Spaceship {
        return this.player.spaceship;
    }
}
