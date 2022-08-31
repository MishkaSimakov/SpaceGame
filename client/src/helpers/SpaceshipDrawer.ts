import Spaceship from "../../../common/Spaceship";
import Vector2 from "../../../common/Vector2";
import * as Phaser from "phaser";
import Module from "../../../common/modules/Module";

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
                this.drawModule(module).setDepth(0)
            );
        }
    }

    drawModule(module: Module): Phaser.GameObjects.Container {
        let modulePosition: Vector2 = this.getGlobalPosition(
            new Vector2(module.x, module.y)
        );

        let connectorsImages = [];

        let backgroundImage = this.scene.add.rectangle(0, 0, this.cardSize.x, this.cardSize.y, module.isMain ? 0xeb4934 : 0x155745)

        let blue_color = 0x02caf7;
        let red_color = 0xf70202;

        connectorsImages.push(
            this.scene.add.text(0, 0, module.name.split(' '), {align: 'center'}).setOrigin(0.5)
        );

        connectorsImages.push(
            this.scene.add.text(0, 35, module.health + '/' + module.totalHealth, {align: 'center'}).setOrigin(0.5)
        );

        if (module.connectors.left !== 0)
            connectorsImages.push(
                this.scene.add.circle(-this.cardSize.x / 2 + 25, 0, 10, module.connectors.left === 1 ? blue_color : red_color)
            );

        if (module.connectors.top !== 0)
            connectorsImages.push(
                this.scene.add.circle(0, -this.cardSize.y / 2 + 25, 10, module.connectors.top === 1 ? blue_color : red_color)
            );

        if (module.connectors.right !== 0)
            connectorsImages.push(
                this.scene.add.circle(this.cardSize.x / 2 - 25, 0, 10, module.connectors.right === 1 ? blue_color : red_color)
            );

        if (module.connectors.bottom !== 0)
            connectorsImages.push(
                this.scene.add.circle(0, this.cardSize.y / 2 - 25, 10, module.connectors.bottom === 1 ? blue_color : red_color)
            );

        return this.scene.add.container(
            modulePosition.x, modulePosition.y,
            [backgroundImage, ...connectorsImages]
        )
            .setSize(this.cardSize.x, this.cardSize.y)
            .setInteractive()
            .setData('module', module);
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