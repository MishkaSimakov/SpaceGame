import Spaceships from "./scenes/game/spaceships";
import Controls from "./scenes/game/controls";
import Module from "../../../common/modules/Module";
import Spaceship from "../../../common/Spaceship";
import Vector2 from "../../../common/Vector2";
import {Event} from "../../../common/events/Event";
import SpaceshipDrawer from "./SpaceshipDrawer";
import Game from "../Game";
import Player from "../../../common/Player";

export default class RebuildSpaceshipManager {
    gameManager: Game;
    isRebuildingSpaceship: boolean = false;

    constructor(gameManager: Game) {
        this.gameManager = gameManager;
    }

    setIsRebuildSpaceshipAllowed(allowed: boolean): void {
        this.isRebuildingSpaceship = allowed;

        if (allowed) {
            this.allowRebuildSpaceship();
        } else {
            this.disallowRebuildSpaceship();
        }
    }

    allowRebuildSpaceship() {
        this.spaceshipDrawer.allowDrag();
        this.controlsScene.handDrawer.allowDrag();

        this.removeEvents();
        this.addEvents();
    }

    disallowRebuildSpaceship() {
        this.spaceshipsScene.spaceshipDrawers[this.player.link].disallowDrag();
        this.controlsScene.handDrawer.disallowDrag();

        this.removeEvents();
    }

    protected addEvents() {
        console.log("add events!");

        for (let shape of this.spaceshipDrawer.moduleShapes) {
            let module: Module = shape.getData('module');

            if (module.isMain)
                continue;

            shape.on('dragstart', () => {
                this.spaceshipsScene.isDragging = true;
            });

            shape.on('drag', (pointer: Phaser.Input.Pointer, x: number, y: number) => {
                shape.setPosition(x, y);
            });

            shape.on('dragend', (pointer: Phaser.Input.Pointer) => {
                this.spaceshipsScene.isDragging = false;

                let localPosition = this.spaceshipDrawer.getLocalPosition(new Vector2(pointer.worldX, pointer.worldY));

                this.spaceship.removeModule(module.x, module.y);

                if (this.spaceship.addModule(module, localPosition.x, localPosition.y)) {
                    let newPosition = this.spaceshipDrawer.getGlobalPosition(localPosition);
                    shape.setPosition(newPosition.x, newPosition.y);

                    let unconnected = this.spaceship.getUnconnectedModules();
                    this.spaceship.removeModule(unconnected);

                    this.spaceshipDrawer.draw();
                    this.spaceshipDrawer.allowDrag();

                    this.hand.push(...unconnected);

                    this.controlsScene.handDrawer.redraw();
                    this.controlsScene.handDrawer.allowDrag();

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
                this.spaceshipDrawer.allowDrag();

                // add to hand cards
                this.hand.push(module, ...unconnected);

                // add to hand shapes
                this.controlsScene.handDrawer.redraw();
                this.controlsScene.handDrawer.allowDrag();

                this.removeEvents();
                this.addEvents();
            });
        }

        let wasRecentlyDragged: boolean = false;

        for (let shape of this.controlsScene.handDrawer.cardShapes) {
            if (shape.getData('type') === 'event')
                continue;

            let module: Module = shape.getData('module');

            shape.on('pointerdown', () => {
                wasRecentlyDragged = false;
            })

            shape.on('pointerup', () => {
                if (!wasRecentlyDragged) {
                    module.rotation = (module.rotation + 1) % 4;
                    shape.setRotation(Math.PI / 2 * module.rotation);
                }
            });

            shape.on('dragstart', () => {
                this.spaceshipsScene.isDragging = true;
            })

            shape.on('drag', (pointer: Phaser.Input.Pointer, x: number, y: number) => {
                shape.setPosition(x, y);
            });

            shape.on('dragend', (pointer: Phaser.Input.Pointer) => {
                wasRecentlyDragged = true;
                this.spaceshipsScene.isDragging = false;

                let position = this.spaceshipsScene.cameras.main.getWorldPoint(pointer.x, pointer.y);
                let localPosition = this.spaceshipDrawer.getLocalPosition(new Vector2(position.x, position.y));

                if (this.spaceship.addModule(module, localPosition.x, localPosition.y)) {
                    // remove from hand cards
                    this.hand.splice(this.hand.indexOf(module), 1);

                    // add to spaceship modules
                    // add to spaceship shapes
                    this.spaceshipDrawer.draw();
                    this.spaceshipDrawer.allowDrag();

                    // redraw hand
                    this.controlsScene.handDrawer.redraw();
                    this.controlsScene.handDrawer.allowDrag();

                    this.removeEvents();
                    this.addEvents();

                    return;
                }

                shape.setPosition(shape.input.dragStartX, shape.input.dragStartY);
            });
        }
    }

    protected removeEvents() {
        for (let shape of this.spaceshipDrawer.moduleShapes) {
            if (shape.getData('module').isMain)
                continue;

            shape.removeAllListeners('drag');
            shape.removeAllListeners('dragend');
            shape.removeAllListeners('dragstart');
        }

        for (let shape of this.controlsScene.handDrawer.cardShapes) {
            if (shape.getData('type') === 'event')
                continue;

            shape.removeAllListeners('pointerup');
            shape.removeAllListeners('pointerdown');
            shape.removeAllListeners('drag');
            shape.removeAllListeners('dragend');
            shape.removeAllListeners('dragstart');
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
        return this.gameManager.spaceshipsScene.spaceshipDrawers[this.player.link];
    }

    private get hand(): (Event|Module)[] {
        return this.player.hand;
    }

    private get spaceship(): Spaceship {
        return this.player.spaceship;
    }
}