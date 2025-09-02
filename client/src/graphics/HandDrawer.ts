import {Card} from "@common/Types";

import Game from "../Game";
import {SIZES} from "./constants";
import {CardShape} from "./shapes/CardShape";
import Scene from "./engine/Scene";
import {Rectangle} from "./engine/shapes/Rectangle";
import Color from "./Color";
import {Group} from "./engine/Group";

export default class HandDrawer {
    group: Group;

    cardShapes: CardShape[] = [];

    scene: Scene;

    gameManager: Game;
    background: Rectangle;

    hand: Card[] = [];

    constructor(game: Game, scene: Scene) {
        this.scene = scene;

        this.gameManager = game;

        this.group = this.scene.createAndAdd.group();
        this.background = new Rectangle();

        this.group.add(this.background);
    }

    setHandData(hand: Card[]) {
        let newHandData = [];

        for (let card of hand) {
            if (card.cardType === "module") {
                const existingModule = this.hand
                    .filter(c => c.cardType === "module")
                    .find(c => c.module.id === card.module.id);

                if (existingModule) {
                    card.module.rotation = existingModule.module.rotation;
                }
            }

            newHandData.push(card);
        }

        this.hand = newHandData;
    }

    redraw() {
        this.destroy();

        let hand = this.hand;

        if (hand.length === 0)
            return;

        const cardSize = Math.max(128 * this.scene.width() / 1440, 75);

        let sceneWidth = this.scene.width() - this.gameManager.controlsScene.topBarDrawer.sizes.width;
        let sceneHeight = this.scene.height();

        let spaceBetween = cardSize * 0.1;
        let handWidth = hand.length * (cardSize + spaceBetween) - spaceBetween;

        let strokeWidth = SIZES.STROKE_WIDTH;

        let startPosition = (sceneWidth - handWidth) / 2;
        let handHeight = cardSize + spaceBetween * 2;

        // draw background
        if (startPosition < spaceBetween * 2) {
            const outsideOffset = 50;

            this.background
                .position({
                    x: -outsideOffset,
                    y: sceneHeight - handHeight,
                })
                .width(sceneWidth + 2 * outsideOffset)
                .height(handHeight + strokeWidth);
        } else {
            this.background
                .position({
                    x: startPosition - spaceBetween,
                    y: sceneHeight - handHeight,
                })
                .width(handWidth + 2 * spaceBetween)
                .height(handHeight + strokeWidth)
                .cornerRadius([10, 10, 0, 0]);
        }

        this.background
            .fill(Color.fromHex('#0B2545', 0.75).toString())
            .stroke(Color.fromHex('#3D76BE').toString())
            .strokeWidth(strokeWidth)

        startPosition = Math.max(startPosition, spaceBetween);

        this.group.add(this.background);

        // draw cards

        for (let [index, card] of hand.entries()) {
            let cardShape = new CardShape({
                size: cardSize,
                card: card,
                x: startPosition + index * (cardSize + spaceBetween),
                y: sceneHeight - spaceBetween,
                originY: 1
            });
            this.group.add(cardShape);

            cardShape.on('click', () => {
                if (card.cardType === "module") {
                    card.module.rotation = (card.module.rotation + 1) % 4;
                    cardShape.rotateCard(card.module.rotation * (Math.PI / 2));
                }
            });

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
