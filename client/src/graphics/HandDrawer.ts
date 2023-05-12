import Module, {isModule} from "../../../common/modules/Module";
import * as Phaser from "phaser";
import Vector2 from "../../../common/Vector2";
import {Event, EventTypes, isEvent} from "../../../common/events/Event";
import {drawEventCard, drawModuleCard} from "./CardsDrawer";
import Game from "../Game";


export default class HandDrawer {
    cardSize: number;
    cardShapes: Phaser.GameObjects.Container[] = [];

    scene: Phaser.Scene;

    gameManager: Game;

    constructor(game: Game, cardSize: number, scene: Phaser.Scene) {
        this.gameManager = game;
        this.cardSize = cardSize;
        this.scene = scene;
    }

    draw() {
        let sceneWidth = this.scene.game.canvas.width;

        this.destroy();

        for (let [index, card] of this.gameManager.getCurrentPlayer().hand.entries()) {
            let position = new Vector2(
                (sceneWidth - this.gameManager.getCurrentPlayer().hand.length * (this.cardSize + 50) + 50) / 2 + index * (this.cardSize + 50) + this.cardSize / 2,
                this.scene.game.canvas.height - this.cardSize / 2 - 10
            );

            let cardShape: Phaser.GameObjects.Container;

            if (isModule(card)) {
                cardShape = drawModuleCard(this.scene, card as Module, position, this.cardSize);
            } else {
                cardShape = drawEventCard(this.scene, card as Event, position, this.cardSize);
            }

            cardShape.setScale(0.5, 0.5);

            if (isEvent(card) && (card as Event).type === EventTypes.SaveCardAndThenDealDamage) {
                this.scene.input.setDraggable(cardShape, true);

                cardShape.on('drag', (pointer: Phaser.Input.Pointer) => {
                    cardShape.setPosition(pointer.x, pointer.y);
                });

                cardShape.on('dragend', async (pointer: Phaser.Input.Pointer) => {
                    let distance_y = Math.abs(pointer.y - cardShape.input.dragStartY);

                    if (distance_y > 50) {
                        let isAccepted = await this.gameManager.useEventCard(card as Event);

                        if (isAccepted) {
                            cardShape.destroy();

                            let hand = this.gameManager.getCurrentPlayer().hand;
                            hand.splice(hand.indexOf(card), 1);
                            this.draw();

                            return;
                        }
                    }

                    cardShape.setPosition(cardShape.input.dragStartX, cardShape.input.dragStartY);
                });
            }

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