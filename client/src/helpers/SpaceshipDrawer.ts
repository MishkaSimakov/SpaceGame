import Spaceship from "../../../common/Spaceship";
import Vector2 from "../../../common/Vector2";
import * as Phaser from "phaser";
import Module from "../../../common/modules/Module";
import {drawModuleCard} from "./cards/CardsDrawer";

export default class SpaceshipDrawer {
    spaceship: Spaceship;
    center: Vector2;
    cardSize: Vector2;
    moduleShapes: Phaser.GameObjects.Container[] = [];

    scene: Phaser.Scene;

    constructor(spaceship: Spaceship, center: Vector2, cardSize: Vector2, scene: Phaser.Scene) {
        this.spaceship = spaceship;
        this.center = center;
        this.cardSize = cardSize;
        this.scene = scene;
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
            this.center.x + localPosition.x * this.cardSize.x,
            this.center.y + localPosition.y * this.cardSize.y
        );
    }

    draw() {
        this.destroy();

        for (let module of this.spaceship.modules) {
            this.moduleShapes.push(
                drawModuleCard(this.scene, module, this.getGlobalPosition(new Vector2(module.x, module.y)))
            );
        }
    }

    allowDrag() {
        for (let shape of this.moduleShapes) {
            if ((shape.getData('module') as Module).isMain)
                continue;

            this.scene.input.setDraggable(shape, true);
        }
    }

    destroy() {
        for (let shape of this.moduleShapes) {
            shape.destroy();
        }

        this.moduleShapes = [];
    }

    disallowDrag() {
        for (let shape of this.moduleShapes) {
            if ((shape.getData('module') as Module).isMain)
                continue;

            this.scene.input.setDraggable(shape, false);
        }
    }
}