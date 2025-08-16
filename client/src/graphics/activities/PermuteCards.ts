import {Event} from "@common/events/Event";
import Module from "@common/modules/Module";

import Controls from "../scenes/Controls";
import {COLORS} from "../constants";
import Color from "../Color";
import {Activity} from "./Activity";
import {Group} from "konva/lib/Group";
import {Rect} from "konva/lib/shapes/Rect";
import {Text} from "konva/lib/shapes/Text";
import {getBackground} from "../shapes/ModalBackground";
import {ModuleShape} from "../shapes/Card";

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

            const sceneWidth = this.scene.width();
            const sceneHeight = this.scene.height();

            const cardShapes = this.scene.drawCardsOnScreen(this.cards);

            const cardPositions = cardShapes.children.map(card => {
                return card.getPosition();
            });

            const fadeShape = new Rect({
                x: 0,
                y: 0,
                width: sceneWidth,
                height: sceneHeight,
                fill: Color.fromHex('#000000', 0.75).toString()
            });

            const horizontal = sceneWidth > sceneHeight;
            const titleShape = new Text({
                x: horizontal
                    ? cardShapes.getClientRect().x
                    : sceneWidth / 2,
                y: cardShapes.getClientRect().y - 15,
                text: "Верх колоды",
                originX: horizontal ? 0 : 0.5,
                originY: 1,
                fill: "white",
                fontFamily: "Exo2Bold",
                fontSize: 20
            });

            const buttonShape = new Text({
                x: sceneWidth / 2,
                y: cardShapes.getClientRect().y + cardShapes.getClientRect().height + 15,
                text: "Далее",
                fill: "white",
                fontFamily: "Exo2Bold",
                originX: 0.5
            });
            buttonShape.on('click', () => {
                this.destructModal();
                resolve(this.order);
            });

            const backgroundShape = getBackground(titleShape, buttonShape, cardShapes);

            //

            const cardShapesInOrder: ModuleShape[] = [];

            for (let i = 0; i < this.cards.length; ++i) {
                const cardShape = cardShapes.children[i];
                cardShapesInOrder.push(cardShape as ModuleShape);

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