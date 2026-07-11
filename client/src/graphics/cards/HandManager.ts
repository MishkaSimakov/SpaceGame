import Color from "@common/helpers/Color";

import Scene from "../engine/Scene";
import {Group} from "../engine/Group";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import {BoundingRect, merge} from "../engine/types";
import {SIZES} from "../constants";
import {CardShape} from "../shapes/CardShape";

/**
 * Draws the hand.
 *
 * Which cards are in the hand and in what order is the board's business — this only lays out the
 * shapes it is given, plus the gap that opens up under the pointer while a card is being dragged
 * into or around the hand.
 */
export class HandManager {
    private readonly maxVisibleCards = 5;
    private readonly cardSize: number;
    private readonly spaceBetween: number;

    private readonly handScene: Scene;

    private moreIndicator: Text | undefined = undefined;
    private background: Rectangle;
    private placeholder: Rectangle;
    private handContents: Group;

    private cards: CardShape[] = [];
    private placeholderIndex: number | undefined = undefined;

    constructor(handScene: Scene, cardSize: number) {
        this.handScene = handScene;
        this.cardSize = cardSize;
        this.spaceBetween = cardSize * 0.1;

        this.background = this.handScene.createAndAdd.rectangle({
            visible: false,
            interactive: false
        });

        this.placeholder = new Rectangle({
            width: this.cardSize,
            height: this.cardSize,
            fill: Color.fromRGBA(0, 0, 0, 0.5).toString(),
            cornerRadius: 5,
            visible: false,
            interactive: false
        });

        this.handContents = this.handScene.createAndAdd.group();
        this.handContents.add(this.placeholder);
    }

    /** Parents a card's shape into the hand. It is laid out by the next setCards. */
    adopt(shape: CardShape) {
        shape.moveTo(this.handContents);
    }

    setCards(cards: CardShape[]) {
        this.cards = cards;
        this.update();
    }

    setPlaceholder(index: number | undefined) {
        this.placeholderIndex = index;
        this.update();
    }

    getPlaceholderIndex(): number | undefined {
        return this.placeholderIndex;
    }

    resize() {
        this.update();
    }

    /**
     * Where in the hand the pointer is asking to drop a card, or undefined if it is not over the
     * hand at all — which is how a drag out onto the field is recognised.
     */
    getDropIndex(): number | undefined {
        const pointer = this.handScene.getRelativePointerPosition();

        if (pointer.y < this.handScene.height() - this.cardSize - 2 * this.spaceBetween) {
            return undefined;
        }

        const slots = this.slotCount();

        if (slots === 0) {
            return 0;
        }

        let bounds = new BoundingRect();

        for (let i = 0; i < Math.min(slots, this.maxVisibleCards); ++i) {
            bounds = merge(bounds, this.slotShape(i).getClientRect());
        }

        // pad by half a gap each side, so every slot is exactly one card wide
        bounds.left -= this.spaceBetween / 2;
        bounds.right += this.spaceBetween / 2;

        const visible = Math.min(slots, this.maxVisibleCards);
        const relative = (pointer.x - bounds.left) / bounds.width * visible;

        return Math.min(Math.max(Math.floor(relative), 0), visible - 1);
    }

    /** Total occupied slots: the cards, plus the gap if one is open. */
    private slotCount(): number {
        return this.cards.length + (this.placeholderIndex !== undefined ? 1 : 0);
    }

    /** The shape drawn in slot `i`, treating the placeholder as if it were a card. */
    private slotShape(index: number): CardShape | Rectangle {
        if (this.placeholderIndex === undefined) {
            return this.cards[index];
        }

        if (index === this.placeholderIndex) {
            return this.placeholder;
        }

        return this.cards[index < this.placeholderIndex ? index : index - 1];
    }

    private update() {
        this.moreIndicator?.destroy();
        this.moreIndicator = undefined;

        const slots = this.slotCount();

        if (slots === 0) {
            this.placeholder.setAttrs({visible: false, interactive: false});
            this.background.setAttrs({visible: false, interactive: false});
            return;
        }

        this.placeholder.setAttrs({
            visible: this.placeholderIndex !== undefined,
            interactive: this.placeholderIndex !== undefined
        });

        for (let i = 0; i < slots; ++i) {
            const shape = this.slotShape(i);
            const visible = i < this.maxVisibleCards;

            shape.setAttrs({
                x: i * (this.cardSize + this.spaceBetween),
                y: 0,
                visible,
                interactive: visible
            });
        }

        if (slots > this.maxVisibleCards) {
            this.moreIndicator = new Text({
                text: `+ ${slots - this.maxVisibleCards}`,
                originX: 0,
                originY: 0.5,
                x: this.maxVisibleCards * (this.cardSize + this.spaceBetween) + this.spaceBetween,
                y: this.cardSize / 2,
                fontFamily: "Exo2Bold",
                fill: Color.WHITE.toString(),
                fontSize: 10
            });

            this.handContents.add(this.moreIndicator);
        }

        const maxWidth = this.handScene.width() - SIZES.CONTROLS_WIDTH;

        this.handContents.setAttrs({
            originX: 0.5,
            originY: 1,
            x: maxWidth / 2,
            y: this.handScene.height() - this.spaceBetween + SIZES.STROKE_WIDTH
        });

        this.background.setAttrs({
            originX: 0.5,
            originY: 1,
            x: maxWidth / 2,
            y: this.handScene.height() + SIZES.STROKE_WIDTH,
            width: this.handContents.getClientRect().width + 2 * this.spaceBetween,
            height: this.cardSize + 2 * this.spaceBetween,
            cornerRadius: [10, 10, 0, 0],

            fill: Color.fromHex('#0B2545', 0.75).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: SIZES.STROKE_WIDTH,

            visible: true,
            interactive: true
        });
    }
}
