import Game from "../Game";
import {SIZES} from "./constants";
import {Card} from "./shapes/Card";
import Scene from "./engine/Scene";
import {Rectangle} from "./engine/shapes/Rectangle";
import Color from "./Color";
import Vector2 from "../../../common/Vector2";
import {isEvent, Event, EventTypes} from "../../../common/events/Event";

export default class HandDrawer {
    cardSize: number;
    cardShapes: Card[] = [];

    scene: Scene;

    gameManager: Game;
    background: Rectangle;

    constructor(game: Game, scene: Scene) {
        this.gameManager = game;
        this.cardSize = Math.max(128 * scene.width() / 1440, 75);
        this.scene = scene;
    }

    redraw() {
        this.destroy();

        let hand = this.gameManager.getCurrentPlayer().hand;

        if (hand.length === 0)
            return;

        let sceneWidth = this.scene.width();
        let sceneHeight = this.scene.height();
        let spaceBetween = this.cardSize * 0.1;
        let handWidth = hand.length * (this.cardSize + spaceBetween) - spaceBetween;

        let startPosition = (sceneWidth - handWidth) / 2;
        let handHeight = this.cardSize + spaceBetween * 2;

        // draw background
        if (startPosition < spaceBetween * 2) {
            this.background = this.scene.createAndAdd.rectangle({
                x: 0,
                y: sceneHeight - handHeight,
                width: sceneWidth,
                height: handHeight
            });
        } else {
            this.background = this.scene.createAndAdd.rectangle({
                x: startPosition - spaceBetween,
                y: sceneHeight - handHeight,
                width: handWidth + 2 * spaceBetween,
                height: handHeight
            });
        }

        let strokeWidth = SIZES.STROKE_WIDTH;
        let borderRadius = 10;
        this.background
            .cornerRadius([borderRadius, borderRadius, 0, 0])
            .fill(Color.fromHex('#0B2545', 0.75).toString())
            .stroke(Color.fromHex('#3D76BE').toString())
            .strokeWidth(strokeWidth)

        startPosition = Math.max(startPosition, spaceBetween);

        // draw cards

        // TODO: uncomment
        console.log(this.cardSize)
        for (let [index, card] of hand.entries()) {
            let cardShape = new Card({
                size: this.cardSize,
                card: card,
                x: startPosition + index * (this.cardSize + spaceBetween),
                y: sceneHeight - spaceBetween,
                originY: 1
            });
            this.scene.add(cardShape);

            if (isEvent(card) && (card as Event).type === EventTypes.SaveCardAndThenDealDamage) {
                cardShape.draggable(true);

                cardShape.on('dragend', async (evt) => {
                    console.log("uncomment");

                    // let distance_y = Math.abs(pointer.y - cardShape.input.dragStartY);
                    //
                    // if (distance_y > 50) {
                    //     let isAccepted = await this.gameManager.useEventCard(card as Event);
                    //
                    //     if (isAccepted) {
                    //         cardShape.destroy();
                    //
                    //         let hand = this.gameManager.getCurrentPlayer().hand;
                    //         hand.splice(hand.indexOf(card), 1);
                    //         this.redraw();
                    //
                    //         return;
                    //     }
                    // }
                    //
                    // cardShape.setPosition(cardShape.input.dragStartX, cardShape.input.dragStartY);
                });
            }

            this.cardShapes.push(cardShape);
        }
    }

    setDragEnabled(isEnabled: boolean) {
        for (let shape of this.cardShapes) {
            if (shape.isModule)
                shape.draggable(isEnabled);
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
