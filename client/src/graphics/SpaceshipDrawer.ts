import Spaceship from "../../../common/Spaceship";
import Vector2 from "../../../common/Vector2";
import Spaceships from "./scenes/spaceships";
import {Card} from "./shapes/Card";
import Module from "../../../common/modules/Module";

export default class SpaceshipDrawer {
    spaceship: Spaceship;
    center: Vector2;
    cardSize: number;
    moduleShapes: Card[] = [];

    spaceshipsScene: Spaceships;

    constructor(spaceship: Spaceship, center: Vector2, cardSize: number, spaceshipsScene: Spaceships) {
        this.spaceship = spaceship;
        this.center = center;
        this.cardSize = cardSize;
        this.spaceshipsScene = spaceshipsScene;
    }

    moveCenterTo(position: Vector2) {
        for (let moduleShape of this.moduleShapes) {
            moduleShape.setPosition({
                x: moduleShape.x() - this.center.x + position.x,
                y: moduleShape.y() - this.center.y + position.y
            });
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
        // TODO: add drag and uncomment
        for (let shape of this.moduleShapes) {
            shape.destroy();
        }
        this.moduleShapes = [];

        for (let module of this.spaceship.modules) {
            let position = this.getGlobalPosition(new Vector2(module.x, module.y));

            let shape = new Card({
                card: module,
                size: this.cardSize,
                x: position.x,
                y: position.y,
                originY: 0.5,
                originX: 0.5
            });

            this.spaceshipsScene.add(shape);

            this.moduleShapes.push(shape);

            if (module.isMain) {
                shape.draggable(true);

                // shape.on('dragstart', () => {
                //     this.spaceshipsScene.isDragging = true;
                //
                //     for (let shape of this.moduleShapes) {
                //         this.spaceshipsScene.children.bringToTop(shape);
                //     }
                // });
                //
                // shape.on('drag', (pointer: Phaser.Input.Pointer, x: number, y: number) => {
                //     this.moveCenterTo(new Vector2(x, y));
                // });
                //
                // shape.on('dragend', () => {
                //     this.spaceshipsScene.isDragging = false;
                // });
            }
        }
    }

    setDragEnabled(isEnabled: boolean) {
        for (let shape of this.moduleShapes) {
            if ((shape.card() as Module).isMain)
                continue;

            shape.draggable(isEnabled);
        }
    }
}
