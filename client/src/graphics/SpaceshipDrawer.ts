import Spaceship from "../../../common/Spaceship";
import Vector2 from "../../../common/Vector2";
import * as Phaser from "phaser";
import Module from "../../../common/modules/Module";
import {drawModuleCard} from "./CardsDrawer";
import Spaceships from "./scenes/game/spaceships";

export default class SpaceshipDrawer {
    spaceship: Spaceship;
    center: Vector2;
    cardSize: number;
    moduleShapes: Phaser.GameObjects.Container[] = [];

    spaceshipsScene: Spaceships;

    constructor(spaceship: Spaceship, center: Vector2, cardSize: number, spaceshipsScene: Spaceships) {
        this.spaceship = spaceship;
        this.center = center;
        this.cardSize = cardSize;
        this.spaceshipsScene = spaceshipsScene;
    }

    moveCenterTo(position: Vector2) {
        for (let moduleShape of this.moduleShapes) {
            moduleShape.setPosition(
                moduleShape.x - this.center.x + position.x,
                moduleShape.y - this.center.y + position.y
            );
        }

        this.center = position;
    }

    getLocalPosition(globalPosition: Vector2): Vector2 {
        globalPosition.subtract(this.center);

        globalPosition.divide(this.cardSize);

        globalPosition.add(0.5);

        globalPosition.x = Math.floor(globalPosition.x);
        globalPosition.y = Math.floor(globalPosition.y);

        return globalPosition;
    }

    getGlobalPosition(localPosition: Vector2): Vector2 {
        return new Vector2(
            this.center.x + localPosition.x * this.cardSize,
            this.center.y + localPosition.y * this.cardSize
        );
    }

    draw() {
        for (let shape of this.moduleShapes) {
            shape.destroy();
        }
        this.moduleShapes = [];

        for (let module of this.spaceship.modules) {
            let shape = drawModuleCard(this.spaceshipsScene, module, this.getGlobalPosition(new Vector2(module.x, module.y)), this.cardSize, module.isActivated);

            this.moduleShapes.push(shape);

            if (module.isMain) {
                this.spaceshipsScene.input.setDraggable(shape, true);

                shape.on('dragstart', () => {
                    this.spaceshipsScene.isDragging = true;

                    for (let shape of this.moduleShapes) {
                        this.spaceshipsScene.children.bringToTop(shape);
                    }
                });

                shape.on('drag', (pointer: Phaser.Input.Pointer, x: number, y: number) => {
                    this.moveCenterTo(new Vector2(x, y));
                });

                shape.on('dragend', () => {
                    this.spaceshipsScene.isDragging = false;
                });
            }
        }
    }

    allowDrag() {
        for (let shape of this.moduleShapes) {
            if ((shape.getData('module') as Module).isMain)
                continue;

            this.spaceshipsScene.input.setDraggable(shape, true);
        }
    }

    disallowDrag() {
        for (let shape of this.moduleShapes) {
            if ((shape.getData('module') as Module).isMain)
                continue;

            this.spaceshipsScene.input.setDraggable(shape, false);
        }
    }
}