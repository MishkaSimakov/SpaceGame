import Module from "../../../common/modules/Module";
import * as Phaser from "phaser";
import Vector2 from "../../../common/Vector2";
import {Event} from "../../../common/events/Event";
import {drawModuleCard, drawEventCard} from "./CardsDrawer";


export default class HandDrawer {
    hand: (Module | Event)[];
    cardSize: Vector2;
    cardShapes: Phaser.GameObjects.Container[] = [];

    scene: Phaser.Scene;

    constructor(hand: (Module | Event)[], cardSize: Vector2, scene: Phaser.Scene) {
        this.hand = hand;
        this.cardSize = cardSize;
        this.scene = scene;
    }

    draw() {
        let sceneWidth = this.scene.game.canvas.width;

        this.destroy();

        for (let [index, card] of this.hand.entries()) {
            let position = new Vector2(
                (sceneWidth - this.hand.length * (this.cardSize.x + 50) + 50) / 2 + index * (this.cardSize.x + 50) + this.cardSize.x / 2,
                this.scene.game.canvas.height - this.cardSize.x / 2 - 10
            );

            let cardShape: Phaser.GameObjects.Container;

            if ((card as Module).name === undefined) { // TODO: fix this
                cardShape = drawEventCard(this.scene, card as Event, position);
            } else {
                cardShape = drawModuleCard(this.scene, card as Module, position);
            }

            cardShape.setScale(0.5, 0.5);

            this.cardShapes.push(cardShape);
        }
    }

    allowDrag() {
        for (let shape of this.cardShapes) {
            if (shape.getData('type') === 'event')
                continue;

            this.scene.input.setDraggable(shape, true);
        }
    }

    disallowDrag() {
        for (let shape of this.cardShapes) {
            if (shape.getData('type') === 'event')
                continue;

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