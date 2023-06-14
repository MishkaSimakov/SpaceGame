import Spaceships from "./scenes/spaceships";
import Controls from "./scenes/controls";
import Module from "../../../common/modules/Module";
import Spaceship from "../../../common/Spaceship";
import Vector2 from "../../../common/Vector2";
import {Event} from "../../../common/events/Event";
import SpaceshipDrawer from "./SpaceshipDrawer";
import Game from "../Game";
import Player from "../../../common/Player";
import {DD} from "./engine/Drag";

export default class RebuildSpaceshipManager {
    gameManager: Game;
    isRebuildingSpaceship: boolean = false;

    constructor(gameManager: Game) {
        this.gameManager = gameManager;
    }

    setIsRebuildSpaceshipAllowed(allowed: boolean): void {
        this.isRebuildingSpaceship = allowed;

        this.spaceshipDrawer.setDragEnabled(allowed);
        this.controlsScene.handDrawer.setDragEnabled(allowed);

        this.removeEvents();
        if (allowed) {
            this.addEvents();
        }
    }

    protected addEvents() {
        for (let shape of this.spaceshipDrawer.moduleShapes) {
            let module = shape.card() as Module;

            if (module.isMain)
                continue;

            shape.on('dragstart.rebuild', () => {
                shape.moveToTop();
            });

            shape.on('dragend.rebuild', () => {
                let pointerPos = this.spaceshipsScene.getGraphics().getPointerPosition();
                let localPosition = this.spaceshipDrawer.getLocalPosition(
                    new Vector2(pointerPos.x, pointerPos.y)
                );

                this.spaceship.removeModule(module.x, module.y);

                if (this.spaceship.addModule(module, localPosition.x, localPosition.y)) {
                    let newPosition = this.spaceshipDrawer.getGlobalPosition(localPosition);
                    shape.setPosition({x: newPosition.x, y: newPosition.y});

                    let unconnected = this.spaceship.getUnconnectedModules();
                    this.spaceship.removeModule(unconnected);

                    this.spaceshipDrawer.draw();
                    this.spaceshipDrawer.setDragEnabled(true);

                    this.hand.push(...unconnected);

                    this.controlsScene.handDrawer.redraw();
                    this.controlsScene.handDrawer.setDragEnabled(true);

                    this.removeEvents();
                    this.addEvents();

                    return;
                }

                // remove from spaceship modules
                // remove from spaceship shapes

                // find modules that become unconnected to main module
                let unconnected = this.spaceship.getUnconnectedModules();
                this.spaceship.removeModule(unconnected);

                this.spaceshipDrawer.draw();
                this.spaceshipDrawer.setDragEnabled(true);

                // add to hand cards
                this.hand.push(module, ...unconnected);

                // add to hand shapes
                this.controlsScene.handDrawer.redraw();
                this.controlsScene.handDrawer.setDragEnabled(true);

                this.removeEvents();
                this.addEvents();
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
                let pointerPosition = this.spaceshipsScene.getGraphics().getPointerPosition();
                let localPosition = this.spaceshipDrawer.getLocalPosition(new Vector2(pointerPosition.x, pointerPosition.y));


                console.log(localPosition);
                if (this.spaceship.addModule(module, localPosition.x, localPosition.y)) {
                    // remove from hand cards
                    this.hand.splice(this.hand.indexOf(module), 1);

                    // add to spaceship modules
                    // add to spaceship shapes
                    this.spaceshipDrawer.draw();
                    this.spaceshipDrawer.setDragEnabled(true);

                    // redraw hand
                    this.controlsScene.handDrawer.redraw();
                    this.controlsScene.handDrawer.setDragEnabled(true);

                    this.removeEvents();
                    this.addEvents();

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
        for (let shape of this.spaceshipDrawer.moduleShapes) {
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

    private get spaceshipDrawer(): SpaceshipDrawer {
        return this.gameManager.spaceshipsScene.spaceshipDrawers[this.player.id];
    }

    private get hand(): (Event | Module)[] {
        return this.player.hand;
    }

    private get spaceship(): Spaceship {
        return this.player.spaceship;
    }
}
