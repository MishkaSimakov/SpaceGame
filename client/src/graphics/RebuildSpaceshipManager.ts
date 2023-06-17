import Spaceships from "./scenes/spaceships";
import Controls from "./scenes/controls";
import Module from "../../../common/modules/Module";
import Spaceship from "../../../common/Spaceship";
import {Event} from "../../../common/events/Event";
import Game from "../Game";
import Player from "../../../common/Player";
import {DD} from "./engine/Drag";
import {Spaceship as SpaceshipShape} from "./shapes/Spaceship";

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

            shape.on('click.rebuild', () => {
                const initRotation = module.rotation;
                this.spaceship.removeModule(module);

                let possibleRotations = this.spaceship.getPossibleRotationsFor(module);

                let index = possibleRotations.indexOf(initRotation);
                index = (index + 1) % possibleRotations.length;

                module.rotation = possibleRotations[index];

                if (this.spaceship.addModule(module, module.x, module.y)) {
                    shape.rotateCard(module.rotation * (Math.PI / 2));
                } else {
                    // something really went wrong
                    module.rotation = initRotation;

                    // last hope
                    this.spaceship.addModule(module, module.x, module.y);
                }
            });

            shape.on('dragstart.rebuild', () => {
                shape.moveToTop();
            });

            shape.on('dragend.rebuild', () => {
                let localPosition = this.spaceshipShape.transformToCardPosition(
                    this.spaceshipShape.getRelativePointerPosition()
                );

                this.spaceship.removeModule(module.x, module.y);

                if (this.spaceship.addModule(module, localPosition.x, localPosition.y)) {
                    shape.setPosition({
                        x: localPosition.x * spaceshipCardSize,
                        y: localPosition.y * spaceshipCardSize
                    });

                    let unconnected = this.spaceship.getUnconnectedModules();
                    this.spaceship.removeModule(unconnected);

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
                let unconnected = this.spaceship.getUnconnectedModules();
                this.spaceship.removeModule(unconnected);

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

            shape.on('dragstart.rebuild', () => {
                shape.moveToTop();
            })

            shape.on('dragend.rebuild', () => {
                let localPosition = this.spaceshipShape.transformToCardPosition(
                    this.spaceshipShape.getRelativePointerPosition()
                );

                if (this.spaceship.addModule(module, localPosition.x, localPosition.y)) {
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
            shape.off('click.rebuild');
            shape.off('drag.rebuild');
            shape.off('dragend.rebuild');
            shape.off('dragstart.rebuild');
        }

        for (let shape of this.controlsScene.handDrawer.cardShapes) {
            shape.off('drag.rebuild');
            shape.off('dragend.rebuild');
            shape.off('dragstart.rebuild');
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
