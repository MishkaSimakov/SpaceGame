import SpaceshipDrawer from "./SpaceshipDrawer";
import HandDrawer from "./HandDrawer";
import Vector2 from "../../../common/Vector2";
import Module from "../../../common/modules/Module";
import Spaceship from "../../../common/Spaceship";

export default class DragManager {
    spaceshipDrawer: SpaceshipDrawer;
    handDrawer: HandDrawer;

    scene: Phaser.Scene;

    isDragging: boolean = false;

    constructor(spaceshipDrawer: SpaceshipDrawer, handDrawer: HandDrawer, scene: Phaser.Scene) {
        this.spaceshipDrawer = spaceshipDrawer;
        this.handDrawer = handDrawer;
        this.scene = scene;
    }

    setupEvents() {
        let spaceship: Spaceship = this.spaceshipDrawer.spaceship;
        let hand: Module[] = this.handDrawer.hand;

        for (let shape of this.spaceshipDrawer.moduleShapes) {
            let module: Module = shape.getData('module');

            if (module.isMain)
                continue;

            shape.removeAllListeners('drag');
            shape.removeAllListeners('dragend');
            shape.removeAllListeners('dragstart');

            shape.on('dragstart', () => {
                this.isDragging = true;
            })

            shape.on('drag', (pointer: Phaser.Input.Pointer, x: number, y: number) => {
                shape.setPosition(x, y);
            });

            shape.on('dragend', (pointer: Phaser.Input.Pointer) => {
                this.isDragging = false;

                let localPosition = this.spaceshipDrawer.getLocalPosition(new Vector2(pointer.worldX, pointer.worldY));

                spaceship.removeModule(module.x, module.y);

                if (spaceship.addModule(module, localPosition.x, localPosition.y)) {
                    let newPosition = this.spaceshipDrawer.getGlobalPosition(localPosition);
                    shape.setPosition(newPosition.x, newPosition.y);

                    return;
                }


                // remove from spaceship modules
                // remove from spaceship shapes
                this.spaceshipDrawer.moduleShapes = this.spaceshipDrawer.moduleShapes.filter(s => s !== shape);

                // add to hand cards
                hand.push(module);

                // add to hand shapes
                let newPosition = this.handDrawer.getGlobalPosition(hand.length - 1);
                shape.setPosition(newPosition.x, newPosition.y);
                shape.setScrollFactor(0);
                this.handDrawer.cardShapes.push(shape);

                this.setupEvents();
            });
        }

        for (let shape of this.handDrawer.cardShapes) {
            let module: Module = shape.getData('module');

            if (module.isMain)
                continue;

            shape.removeAllListeners('drag');
            shape.removeAllListeners('dragend');
            shape.removeAllListeners('dragstart');

            shape.on('dragstart', () => {
                this.isDragging = true;
            })

            shape.on('drag', (pointer: Phaser.Input.Pointer, x: number, y: number) => {
                shape.setPosition(x, y);
            });

            shape.on('dragend', (pointer: Phaser.Input.Pointer) => {
                this.isDragging = false;

                let localPosition = this.spaceshipDrawer.getLocalPosition(new Vector2(pointer.worldX, pointer.worldY));

                if (spaceship.addModule(module, localPosition.x, localPosition.y)) {
                    // remove from hand cards
                    hand.splice(hand.indexOf(module),  1);

                    // remove from hand shapes
                    this.handDrawer.cardShapes = this.handDrawer.cardShapes.filter(s => s !== shape);

                    // add to spaceship modules
                    // add to spaceship shapes
                    let newPosition = this.spaceshipDrawer.getGlobalPosition(localPosition);
                    shape.setPosition(newPosition.x, newPosition.y);
                    shape.setScrollFactor(1);

                    this.spaceshipDrawer.moduleShapes.push(shape);

                    this.setupEvents();

                    return;
                }

                shape.setPosition(shape.input.dragStartX, shape.input.dragStartY);
            });
        }
    }
}