import {Event} from "@common/events/Event";
import Module from "@common/modules/Module";

import Controls from "../scenes/Controls";
import {Group} from "../engine/Group";
import {COLORS} from "../constants";
import {Rectangle} from "../engine/shapes/Rectangle";
import Color from "../Color";
import {Text} from "../engine/shapes/Text";
import Vector2 from "@common/Vector2";
import {Activity} from "./Activity";
import {Card} from "../shapes/Card";

export class PermuteCardsActivity extends Activity {
    private modalGroup?: Group = undefined;
    private order: number[] = [];

    private resolveModal: Function | undefined = undefined;

    constructor(private scene: Controls, private cards: (Event | Module)[]) {
        super();

        for (let i = 0; i < cards.length; ++i) {
            this.order.push(i);
        }
    }

    activate() {
        return new Promise<number[]>(resolve => {
            this.scene.topBarDrawer.addButtons([{
                text: "Переставить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    this.scene.topBarDrawer.setAllButtonsDisabled(true);

                    this.showModal().then(order => {
                        if (order !== undefined) {
                            this.scene.topBarDrawer.removeButtons();

                            resolve(order);
                        } else {
                            this.scene.topBarDrawer.setAllButtonsDisabled(false);
                        }
                    });
                }
            }]);
        });
    }

    update() {
        if (this.modalGroup !== undefined) {
            this.destructModal();
            this.resolveModal();

            this.resolveModal = undefined;
        }
    }

    private showModal() {
        return new Promise<number[] | undefined>(resolve => {
            this.resolveModal = resolve;

            this.modalGroup = new Group();

            const offset = 20;
            const sceneWidth = this.scene.width();
            const sceneHeight = this.scene.height();

            const cardShapes = this.scene.drawCardsOnScreen(this.cards);

            const cardPositions = cardShapes.children.map(card => {
                return card.getPosition();
            });

            const fadeShape = new Rectangle({
                x: 0,
                y: 0,
                width: sceneWidth,
                height: sceneHeight,
                fill: Color.fromHex('#000000', 0.75).toString()
            });

            const horizontal = sceneWidth > sceneHeight;
            const titleShape = new Text({
                x: horizontal
                    ? cardShapes.getClientRect().left
                    : sceneWidth / 2,
                y: cardShapes.getClientRect().top - 15,
                text: "Верх колоды",
                originX: horizontal ? 0 : 0.5,
                originY: 1,
                fill: "white",
                fontFamily: "Exo2Bold",
                fontSize: 20
            });

            const buttonShape = new Text({
                x: sceneWidth / 2,
                y: cardShapes.getClientRect().bottom + 15,
                text: "Далее",
                fill: "white",
                fontFamily: "Exo2Bold",
                originX: 0.5
            })
                .on('click', () => {
                    this.destructModal();
                    resolve(this.order);
                });

            const backgroundPosition1 = new Vector2(
                Math.min(cardShapes.getClientRect().left, titleShape.getClientRect().left) - offset,
                titleShape.getClientRect().top - offset
            );
            const backgroundPosition2 = new Vector2(
                Math.max(cardShapes.getClientRect().right, titleShape.getClientRect().right) + offset,
                buttonShape.getClientRect().bottom + offset
            );
            const backgroundShape = new Rectangle({
                x: backgroundPosition1.x,
                y: backgroundPosition1.y,
                width: backgroundPosition2.x - backgroundPosition1.x,
                height: backgroundPosition2.y - backgroundPosition1.y,
                fill: Color.fromHex('#0B2545', 0.75).toString(),
                stroke: Color.fromHex('#3D76BE').toString(),
                strokeWidth: 2
            });

            //

            const cardShapesInOrder: Card[] = [];

            for (let i = 0; i < this.cards.length; ++i) {
                const cardShape = cardShapes.children[i];
                cardShapesInOrder.push(cardShape as Card);

                cardShape.draggable(true);
                cardShape.on('dragstart', () => {
                    cardShape.moveToTop();
                });

                cardShape.on('dragmove', () => {
                    // fix index
                    const index = i;

                    const pos = cardShapes.getRelativePointerPosition();
                    let newIndexInOrder = this.getCardIndexByPosition(this.cards.length, pos.x, pos.y);

                    // because order could be updated
                    let oldIndexInOrder = this.order.indexOf(index);

                    if (newIndexInOrder !== oldIndexInOrder) {
                        this.order.splice(oldIndexInOrder, 1);
                        this.order.splice(newIndexInOrder, 0, index);

                        moveCards(index);
                    }
                });

                cardShape.on('dragend', () => {
                    moveCards();
                });
            }

            this.modalGroup.add(fadeShape, backgroundShape, titleShape, buttonShape, cardShapes);
            this.scene.add(this.modalGroup);

            const moveCards = (except?: number) => {
                for (let [indexInOrder, index] of this.order.entries()) {
                    if (index === except)
                        continue;

                    cardShapesInOrder[index].setPosition(cardPositions[indexInOrder]);
                }
            }

            moveCards();

            fadeShape.on('click', () => {
                this.destructModal();

                resolve(undefined);
            });
        });
    }

    private destructModal() {
        this.modalGroup?.destroy();
        this.modalGroup = undefined;
    }

    private getCardIndexByPosition(cardsLength: number, x: number, y: number) {
        const sceneWidth = this.scene.width();
        const sceneHeight = this.scene.height();

        const maxCardSize = Math.min(sceneWidth, sceneHeight) * 0.75;
        const spaceAvailable = Math.max(sceneWidth, sceneHeight) * 0.75;
        const padding = 20;

        const cardSize = Math.min(maxCardSize, (spaceAvailable + padding) / cardsLength - padding);

        const clamp = (x, min, max) => {
            return Math.min(Math.max(x, min), max);
        }

        if (sceneWidth > sceneHeight) {
            return clamp(
                Math.floor(x / (cardSize + padding)),
                0,
                cardsLength
            );
        } else {
            return clamp(
                Math.floor(y / (cardSize + padding)),
                0,
                cardsLength
            )
        }
    }
}