import Game from "../Game";
import {SIZES} from "./constants";
import {Card} from "./shapes/Card";
import Scene from "./engine/Scene";
import {Rectangle} from "./engine/shapes/Rectangle";
import Color from "./Color";
import {isEvent, Event, EventTypes} from "../../../common/events/Event";
import {Group} from "./engine/Group";

export default class HandDrawer {
    group: Group;

    cardSize: number;
    cardShapes: Card[] = [];

    scene: Scene;

    gameManager: Game;
    background: Rectangle;

    constructor(game: Game, scene: Scene) {
        this.gameManager = game;
        this.cardSize = Math.max(128 * scene.width() / 1440, 75);
        this.scene = scene;

        this.group = this.scene.createAndAdd.group();
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

        let strokeWidth = SIZES.STROKE_WIDTH;

        let startPosition = (sceneWidth - handWidth) / 2;
        let handHeight = this.cardSize + spaceBetween * 2;

        // draw background
        if (startPosition < spaceBetween * 2) {
            this.background = new Rectangle({
                x: -strokeWidth,
                y: sceneHeight - handHeight,
                width: sceneWidth + 2 * strokeWidth,
                height: handHeight + strokeWidth
            });
        } else {
            this.background = new Rectangle({
                x: startPosition - spaceBetween,
                y: sceneHeight - handHeight,
                width: handWidth + 2 * spaceBetween,
                height: handHeight + strokeWidth,
                cornerRadius: [10, 10, 0, 0]
            });
        }

        this.background
            .fill(Color.fromHex('#0B2545', 0.75).toString())
            .stroke(Color.fromHex('#3D76BE').toString())
            .strokeWidth(strokeWidth)

        startPosition = Math.max(startPosition, spaceBetween);

        // draw cards

        this.group.add(this.background);

        // TODO: uncomment
        for (let [index, card] of hand.entries()) {
            let cardShape = new Card({
                size: this.cardSize,
                card: card,
                x: startPosition + index * (this.cardSize + spaceBetween),
                y: sceneHeight - spaceBetween,
                originY: 1
            });
            this.group.add(cardShape);

            let rotation = 0;
            cardShape.on('click', () => {
                rotation++;
                cardShape.rotateCard(rotation * Math.PI / 2);
            });

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
