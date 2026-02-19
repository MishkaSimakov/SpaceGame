import {CardInfo} from "./CardInfo";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import {Group} from "../engine/Group";
import {SIZES} from "../constants";
import Color from "../Color";
import Scene from "../engine/Scene";
import * as assert from "assert"
import {CardGetters} from "@common/getters/Card";
import {BoundingRect, merge} from "../engine/types";
import {Line} from "../engine/shapes/Line";

type PlaceholderInfo = { shape: Rectangle, card: { cardType: "placeholder" } };

export class HandManager {
    private readonly maxVisibleCards = 2;
    private readonly cardSize: number;
    private readonly spaceBetween: number;

    private readonly handScene: Scene;

    private moreIndicator: Text | undefined = undefined;
    private background: Rectangle;
    private placeholder: Rectangle;
    private handContents: Group;

    private cards: (CardInfo | PlaceholderInfo)[] = [];

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

    addCardToScene(info: CardInfo) {
        assert.equal(info.shape.getScene(), undefined);

        this.handContents.add(info.shape);
    }

    pushCardToHand(info: CardInfo) {
        assert.equal(info.location.type, "hand");
        assert.equal(info.shape.getScene(), this.handScene);

        this.cards.push(info);
        this.update();
    }

    addPlaceholder(position: number) {
        assert.ok(this.cards.find(o => o.card.cardType === "placeholder") === undefined);
        assert.ok(0 <= position && position <= Math.min(this.cards.length, this.maxVisibleCards - 1));

        this.cards.splice(position, 0, {shape: this.placeholder, card: {cardType: "placeholder"}});
        this.update();
    }

    setPlaceholderPosition(position: number) {
        assert.ok(0 <= position && position <= Math.min(this.cards.length, this.maxVisibleCards - 1));

        const currentPosition = this.cards.findIndex(o => o.card.cardType === "placeholder");
        assert.ok(currentPosition !== undefined);

        const placeholder = this.cards.splice(currentPosition, 1);
        this.cards.splice(position, 0, placeholder[0]);

        this.update();
    }

    replaceCardWithPlaceholder(info: CardInfo) {
        const index = this.getCardIndex(info);

        assert.ok(index !== undefined);
        this.cards[index] = {shape: this.placeholder, card: {cardType: "placeholder"}};

        this.update();
    }

    replacePlaceholderWithCard(info: CardInfo) {
        info.shape.moveTo(this.handContents);

        const index = this.cards.findIndex(c => c.card.cardType === "placeholder");

        assert.ok(index !== undefined);
        this.cards[index] = info;

        this.update();
    }

    removePlaceholder() {
        const currentPosition = this.cards.findIndex(o => o.card.cardType === "placeholder");
        assert.ok(currentPosition !== undefined);

        this.cards.splice(currentPosition, 1);

        this.update();
    }

    // returns undefined if card is too far from hand
    getPlaceholderPosition(): number | undefined {
        // remove placeholder if card is too high
        const pointerPosition = this.handScene.getRelativePointerPosition();
        if (pointerPosition.y < this.handScene.height() - this.cardSize - 2 * this.spaceBetween) {
            return undefined;
        }

        if (this.cards.length === 0) {
            return 0;
        }

        let handCardsBR = new BoundingRect();

        const visibleCardsCount = Math.min(this.cards.length, this.maxVisibleCards);
        for (let i = 0; i < visibleCardsCount; ++i) {
            handCardsBR = merge(handCardsBR, this.cards[i].shape.getClientRect());
        }

        const centerPosition = {
            x: pointerPosition.x,
            y: pointerPosition.y
        };

        // add padding to make calculations easier
        // now we can assume that each card has size: this.spaceBetween / 2 + this.cardSize + this.spaceBetween / 2
        handCardsBR.left -= this.spaceBetween / 2;
        handCardsBR.right += this.spaceBetween / 2;

        const relativeX = (centerPosition.x - handCardsBR.left) / handCardsBR.width * visibleCardsCount;

        // clamp between 0 and visibleCardsCount
        return Math.min(Math.max(Math.floor(relativeX), 0), visibleCardsCount - 1);
    }

    popCardFromHand(info: CardInfo) {
        assert.equal(info.shape.getScene(), this.handScene);
        assert.ok(this.getCardIndex(info) !== undefined);

        const index = this.getCardIndex(info);
        this.cards.splice(index, 1);
        this.update();
    }

    resize() {
        this.update();
    }

    private update() {
        this.moreIndicator?.destroy();

        this.placeholder.setAttrs({
            visible: false,
            interactive: false
        });

        if (this.cards.length === 0) {
            this.background.setAttrs({
                visible: false,
                interactive: false
            });
            return;
        }

        const maxWidth = this.handScene.width() - SIZES.CONTROLS_WIDTH;

        // draw cards
        for (let i = 0; i < this.cards.length; ++i) {
            if (this.cards[i].card.cardType === "placeholder") {
                this.placeholder.setAttrs({
                    x: i * (this.cardSize + this.spaceBetween),
                    y: 0,

                    visible: true,
                    interactive: true
                });
            } else if (i < this.maxVisibleCards) {
                this.cards[i].shape.setAttrs({
                    x: i * (this.cardSize + this.spaceBetween),
                    y: 0,

                    visible: true,
                    interactive: true
                });
            } else {
                this.cards[i].shape.setAttrs({
                    visible: false,
                    interactive: false
                });
            }
        }

        // draw more indicator
        if (this.cards.length > this.maxVisibleCards) {
            this.moreIndicator = new Text({
                text: `+ ${this.cards.length - this.maxVisibleCards}`,

                originX: 0,
                originY: 0.5,
                x: this.maxVisibleCards * (this.cardSize + this.spaceBetween) + this.spaceBetween,
                y: this.cardSize / 2,

                fontFamily: "Exo2Bold",
                fill: Color.WHITE.toString(),
                fontSize: 10,
            });

            this.handContents.add(this.moreIndicator);
        }

        this.handContents.setAttrs({
            originX: 0.5,
            originY: 1,

            x: maxWidth / 2,
            y: this.handScene.height() - this.spaceBetween + SIZES.STROKE_WIDTH
        });

        // draw background
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

    private getCardIndex(info: CardInfo): number | undefined {
        return this.cards.findIndex(o =>
            o.card.cardType !== "placeholder" && CardGetters.id(o.card) === CardGetters.id(info.card)
        );
    }
}