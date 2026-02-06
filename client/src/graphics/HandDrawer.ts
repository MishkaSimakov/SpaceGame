import {Card} from "@common/Types";

import Game from "../Game";
import {SIZES} from "./constants";
import {CardShape} from "./shapes/CardShape";
import Scene from "./engine/Scene";
import {Rectangle} from "./engine/shapes/Rectangle";
import Color from "./Color";
import {Group} from "./engine/Group";
import {Text} from "./engine/shapes/Text";

export default class HandDrawer {
    scene: Scene;

    cardShapes: CardShape[] = [];
    moreIndicator: Text | undefined = undefined;
    background: Rectangle | undefined = undefined;

    gameManager: Game;
    hand: Card[] = [];

    constructor(game: Game, scene: Scene) {
        this.scene = scene;
        this.gameManager = game;
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

        const hand = this.hand;
        const maxVisibleCards = 5;

        if (hand.length === 0) {
            return;
        }

        const cardSize = Math.max(128 * this.scene.width() / 1440, 75);
        const maxWidth = this.scene.width() - this.gameManager.controlsScene.topBarDrawer.sizes.width;
        const spaceBetween = cardSize * 0.1;

        // draw cards
        const handContents = new Group();

        for (let i = 0; i < Math.min(hand.length, maxVisibleCards); ++i) {
            const card = hand[i];

            const cardShape = new CardShape({
                size: cardSize,
                card: card,
                x: i * (cardSize + spaceBetween),
                y: 0,
            });
            handContents.add(cardShape);

            cardShape.on('click', () => {
                if (card.cardType === "module") {
                    card.module.rotation = (card.module.rotation + 1) % 4;
                    cardShape.rotateCard(card.module.rotation * (Math.PI / 2));
                }
            });

            this.cardShapes.push(cardShape);
        }

        // draw more indicator
        if (hand.length > maxVisibleCards) {
            this.moreIndicator = new Text({
                text: `+ ${hand.length - maxVisibleCards}`,

                originX: 0,
                originY: 0.5,
                x: maxVisibleCards * (cardSize + spaceBetween) + spaceBetween,
                y: cardSize / 2,

                fontFamily: "Exo2Bold",
                fill: "white",
                fontSize: 10,
            });

            handContents.add(this.moreIndicator);
        }

        handContents.setAttrs({
            originX: 0.5,
            originY: 1,

            x: maxWidth / 2,
            y: this.scene.height() - spaceBetween + SIZES.STROKE_WIDTH
        });

        // draw background
        this.background = new Rectangle({
            originX: 0.5,
            originY: 1,
            x: maxWidth / 2,
            y: this.scene.height() + SIZES.STROKE_WIDTH,
            width: handContents.getClientRect().width + 2 * spaceBetween,
            height: handContents.getClientRect().height + 2 * spaceBetween,
            cornerRadius: [10, 10, 0, 0],

            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: SIZES.STROKE_WIDTH
        });

        this.scene.add(this.background, handContents);
    }

    setDragEnabled(isEnabled: boolean) {
        for (let shape of this.cardShapes) {
            if (shape.isModule) {
                shape.draggable(isEnabled);
            }
        }
    }

    destroy() {
        this.background?.destroy();
        this.background = undefined;

        this.moreIndicator?.destroy();
        this.moreIndicator = undefined;

        for (const shape of this.cardShapes) {
            shape.destroy();
        }

        this.cardShapes = [];
    }
}
