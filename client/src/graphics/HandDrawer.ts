import {Event} from "@common/events/Event";

import Game from "../Game";
import {SIZES} from "./constants";
import {Card} from "./shapes/Card";
import Scene from "./engine/Scene";
import {Rectangle} from "./engine/shapes/Rectangle";
import Color from "./Color";
import {Group} from "./engine/Group";
import Module, {isModule} from "../../../common/modules/Module";

export default class HandDrawer {
    group: Group;

    cardShapes: Card[] = [];

    scene: Scene;

    gameManager: Game;
    background: Rectangle;

    hand: (Module | Event)[] = [];

    constructor(game: Game, scene: Scene) {
        this.scene = scene;

        this.gameManager = game;

        this.group = this.scene.createAndAdd.group();
        this.background = new Rectangle();

        this.group.add(this.background);
    }

    setHandData(hand: (Module | Event)[]) {
        let newHandData = [];

        for (let card of hand) {
            if (isModule(card)) {
                const module = card as Module;

                const existingModule = this.hand.find(c => {
                    return isModule(c) && (c as Module).id === module.id;
                });

                if (existingModule)
                    module.rotation = (existingModule as Module).rotation;
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

        let sceneWidth = this.scene.width();
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
            let cardShape = new Card({
                size: cardSize,
                card: card,
                x: startPosition + index * (cardSize + spaceBetween),
                y: sceneHeight - spaceBetween,
                originY: 1
            });
            this.group.add(cardShape);

            cardShape.on('click', () => {
                if (isModule(card)) {
                    card.rotation = (card.rotation + 1) % 4;
                    cardShape.rotateCard(card.rotation * (Math.PI / 2));
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
