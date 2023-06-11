import Game from "../Game";
import {SIZES} from "./constants";
import Scene from "./engine/Scene";
import Rectangle from "./engine/shapes/Rectangle";
import Color from "./engine/types/Color";
import Container from "./engine/shapes/Container";


export default class HandDrawer {
    cardSize: number;
    cardShapes: Container[] = [];

    scene: Scene;

    gameManager: Game;
    background: Rectangle;

    constructor(game: Game, scene: Scene) {
        this.gameManager = game;
        this.cardSize = Math.max(128 * scene.width / 1440, 75);
        this.scene = scene;
    }

    redraw() {
        this.destroy();

        let hand = this.gameManager.getCurrentPlayer().hand;

        if (hand.length === 0)
            return;

        let sceneWidth = this.scene.width;
        let sceneHeight = this.scene.height;
        let spaceBetween = this.cardSize * 0.1;
        let handWidth = hand.length * (this.cardSize + spaceBetween) - spaceBetween;

        let startPosition = (sceneWidth - handWidth) / 2;
        let handHeight = this.cardSize + spaceBetween * 2;

        // draw background
        if (startPosition < spaceBetween * 2) {
            this.background = this.scene.rect(0, sceneHeight - handHeight, sceneWidth, handHeight);
        } else {
            this.background = this.scene.rect(
                startPosition - spaceBetween, sceneHeight - handHeight,
                handWidth + 2 * spaceBetween, handHeight
            );
        }

        let strokeWidth = SIZES.STROKE_WIDTH;
        let borderRadius = 10;
        this.background.setCornerRadius({tl: borderRadius, tr: borderRadius, bl: 0, br: 0});
        this.background.setFillStyle(Color.fromHex('#0B2545', 0.75));
        this.background.setStrokeStyle(Color.fromHex('#3D76BE'), strokeWidth);

        startPosition = Math.max(startPosition, spaceBetween);

        // draw cards

        // TODO: uncomment
        // for (let [index, card] of hand.entries()) {
        //     let position = new Vector2(
        //         startPosition + index * (this.cardSize + spaceBetween),
        //         sceneHeight - spaceBetween
        //     );
        //
        //     position.add(new Vector2(this.cardSize / 2, -this.cardSize / 2));
        //
        //     let cardShape = drawCard(this.scene, card, position, this.cardSize);
        //
        //     if (isEvent(card) && (card as Event).type === EventTypes.SaveCardAndThenDealDamage) {
        //         this.scene.input.setDraggable(cardShape, true);
        //
        //         cardShape.on('drag', (pointer: Phaser.Input.Pointer) => {
        //             cardShape.setPosition(pointer.x, pointer.y);
        //         });
        //
        //         cardShape.on('dragend', async (pointer: Phaser.Input.Pointer) => {
        //             let distance_y = Math.abs(pointer.y - cardShape.input.dragStartY);
        //
        //             if (distance_y > 50) {
        //                 let isAccepted = await this.gameManager.useEventCard(card as Event);
        //
        //                 if (isAccepted) {
        //                     cardShape.destroy();
        //
        //                     let hand = this.gameManager.getCurrentPlayer().hand;
        //                     hand.splice(hand.indexOf(card), 1);
        //                     this.redraw();
        //
        //                     return;
        //                 }
        //             }
        //
        //             cardShape.setPosition(cardShape.input.dragStartX, cardShape.input.dragStartY);
        //         });
        //     }
        //
        //     this.cardShapes.push(cardShape);
        // }
    }

    allowDrag() {
        // TODO: uncomment

        // for (let shape of this.cardShapes) {
        //     if (shape.getData('type') === 'event')
        //         continue;
        //
        //     this.scene.input.setDraggable(shape, true);
        // }
    }

    disallowDrag() {
        // for (let shape of this.cardShapes) {
        //     if (shape.getData('type') === 'event')
        //         continue;
        //
        //     this.scene.input.setDraggable(shape, false);
        // }
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
