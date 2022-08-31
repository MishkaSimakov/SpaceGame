import Module from "../../../common/modules/Module";
import * as Phaser from "phaser";
import Vector2 from "../../../common/Vector2";

export default class HandDrawer {
    hand: Module[];
    cardSize: Vector2;
    cardShapes: Phaser.GameObjects.Container[] = [];

    scene: Phaser.Scene;

    constructor(hand: Module[], cardSize: Vector2, scene: Phaser.Scene) {
        this.hand = hand;
        this.cardSize = cardSize;
        this.scene = scene;
    }

    draw() {
        this.destroy();

        for (let [position, module] of this.hand.entries()) {
            let moduleShape = this.drawModule(module, position);

            this.cardShapes.push(moduleShape);
        }
    }

    getGlobalPosition(position: number): Vector2 {
        return new Vector2(
            400 + position * (this.cardSize.x + 25),
            this.scene.game.canvas.height - this.cardSize.x / 2 - 10
        );
    }

    drawModule(module: Module, position: number): Phaser.GameObjects.Container {
        let modulePosition = this.getGlobalPosition(position);

        let connectorsImages = [];

        let backgroundImage = this.scene.add.rectangle(0, 0, this.cardSize.x, this.cardSize.y, module.isMain ? 0xeb4934 : 0x155745)

        let blue_color = 0x02caf7;
        let red_color = 0xf70202;

        connectorsImages.push(
            this.scene.add.text(0, 0, module.name.split(' '), {align: 'center'}).setOrigin(0.5)
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
        for (let shape of this.cardShapes) {
            this.scene.input.setDraggable(shape, true);
        }
    }

    disallowDrag() {
        for (let shape of this.cardShapes) {
            this.scene.input.setDraggable(shape, false);
        }
    }

    destroy() {
        for (let shape of this.cardShapes) {
            shape.destroy();
        }

        this.cardShapes = [];
    }
}