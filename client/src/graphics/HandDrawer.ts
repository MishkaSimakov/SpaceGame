import Module, {isModule} from "../../../common/modules/Module";
import * as Phaser from "phaser";
import Vector2 from "../../../common/Vector2";
import {Event, EventTypes, isEvent} from "../../../common/events/Event";
import {drawEventCard, drawModuleCard} from "./CardsDrawer";
import Game from "../Game";
import {SIZES} from "./constants";


export default class HandDrawer {
    cardSize: number;
    cardShapes: Phaser.GameObjects.Container[] = [];

    scene: Phaser.Scene;

    gameManager: Game;
    background: Phaser.GameObjects.Graphics;

    constructor(game: Game, scene: Phaser.Scene) {
        this.gameManager = game;
        this.cardSize = Math.max(128 * scene.game.canvas.width / 1440, 75);
        this.scene = scene;
    }

    draw() {
        this.destroy();

        let hand = this.gameManager.getCurrentPlayer().hand;

        if (hand.length === 0)
            return;

        let sceneWidth = this.scene.game.canvas.width;
        let sceneHeight = this.scene.game.canvas.height;
        let spaceBetween = this.cardSize * 0.1;
        let handWidth = hand.length * (this.cardSize + spaceBetween) - spaceBetween;

        let startPosition = (sceneWidth - handWidth) / 2;
        let handHeight = this.cardSize + spaceBetween * 2;

        // draw background
        this.background = this.scene.add.graphics();

        let strokeWidth = SIZES.STROKE_WIDTH;
        let borderRadius = 10;
        this.background.fillStyle(0x0B2545, 0.75);
        this.background.lineStyle(strokeWidth, 0x3D76BE);

        if (startPosition < spaceBetween * 2) {
            this.background.fillRect(0, sceneHeight - handHeight, sceneWidth, handHeight);
            this.background.strokeRect(
                0 - strokeWidth / 2, sceneHeight - handHeight - strokeWidth / 2,
                sceneWidth + strokeWidth, handHeight + strokeWidth
            );
        } else {
            this.background.fillRoundedRect(
                startPosition - spaceBetween, sceneHeight - handHeight,
                handWidth + 2 * spaceBetween, handHeight,
                {tl: borderRadius, tr: borderRadius, bl: 0, br: 0}
            );
            this.background.strokeRoundedRect(
                startPosition - spaceBetween - strokeWidth / 2, sceneHeight - handHeight - strokeWidth / 2,
                handWidth + 2 * spaceBetween + strokeWidth, handHeight + strokeWidth,
                {tl: borderRadius, tr: borderRadius, bl: 0, br: 0}
            );
        }

        startPosition = Math.max(startPosition, spaceBetween);


        // draw cards
        for (let [index, card] of hand.entries()) {
            let position = new Vector2(
                startPosition + index * (this.cardSize + spaceBetween),
                sceneHeight - spaceBetween
            );

            position.add(new Vector2(this.cardSize / 2, -this.cardSize / 2));

            let cardShape: Phaser.GameObjects.Container;

            if (isModule(card)) {
                cardShape = drawModuleCard(this.scene, card as Module, position, this.cardSize);
            } else {
                cardShape = drawEventCard(this.scene, card as Event, position, this.cardSize);
            }

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
        if (this.background)
            this.background.destroy();

        for (let shape of this.cardShapes) {
            shape.destroy();
        }

        this.cardShapes = [];
    }
}