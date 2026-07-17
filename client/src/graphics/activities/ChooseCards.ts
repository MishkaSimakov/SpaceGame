import {Card} from "@common/Types";

import {Group} from "../engine/Group";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import Color from "@common/helpers/Color";
import {CardShape} from "../shapes/CardShape";
import Controls from "../scenes/Controls";
import {Activity} from "./Activity";
import {COLORS} from "../constants";
import {BoundaryType, CountBoundary, CountBoundaryValidationResult} from "../CountBoundary";
import {getCardsGrid} from "../shapes/CardsGrid";

export class ChooseCardsActivity extends Activity {
    private modalGroup?: Group = undefined;
    private buttonShape?: Text = undefined;
    private resolveModal: ((selected: number[] | undefined) => void) | undefined = undefined;

    private selected: number[] = [];

    constructor(private scene: Controls, private title: string, private count: CountBoundary, private cards: Card[]) {
        super();
    }

    activate() {
        return new Promise<number[]>(resolve => {
            this.scene.topBarDrawer.setStatus(this.title);

            this.scene.topBarDrawer.addButtons([{
                text: "Выбрать",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    this.showModal().then(selected => {
                        if (selected !== undefined) {
                            this.scene.topBarDrawer.removeButtons();
                            this.scene.topBarDrawer.clearStatus();

                            resolve(selected);
                        }
                    });
                }
            }]);
        });
    }

    update() {
        if (this.modalGroup !== undefined) {
            this.destructModal();
            this.resolveModal(undefined);

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

            const cardShapes = getCardsGrid(this.cards, sceneWidth, sceneHeight);

            const fadeShape = new Rectangle({
                x: 0,
                y: 0,
                width: sceneWidth,
                height: sceneHeight,
                fill: Color.fromHex('#000000', 0.75).toString()
            });

            const titleShape = new Text({
                x: sceneWidth / 2,
                y: cardShapes.getClientRect().top - 15,
                text: this.title,
                originX: 0.5,
                originY: 1,
                fill: Color.WHITE.toString(),
                fontFamily: "Exo2Bold",
                fontSize: 20
            });

            this.buttonShape = new Text({
                x: sceneWidth / 2,
                y: cardShapes.getClientRect().bottom + 15,
                text: "",
                fontFamily: "Exo2Bold",
                originX: 0.5
            })
                .on('pointerdown', () => {
                    const validationResult = this.validateCount(this.selected.length);

                    if (validationResult.verdict === "correct") {
                        this.destructModal();
                        resolve(this.selected);
                    }
                });
            this.updateButton();

            const backgroundPosition1 = {
                x: Math.min(cardShapes.getClientRect().left, titleShape.getClientRect().left) - offset,
                y: titleShape.getClientRect().top - offset
            };
            const backgroundPosition2 = {
                x: Math.max(cardShapes.getClientRect().right, titleShape.getClientRect().right) + offset,
                y: this.buttonShape.getClientRect().bottom + offset
            };

            const backgroundShape = new Rectangle({
                x: backgroundPosition1.x,
                y: backgroundPosition1.y,
                width: backgroundPosition2.x - backgroundPosition1.x,
                height: backgroundPosition2.y - backgroundPosition1.y,
                fill: Color.fromHex('#0B2545', 0.75).toString(),
                stroke: Color.fromHex('#3D76BE').toString(),
                strokeWidth: 2
            });

            cardShapes.children.forEach((shape, index) => {
                const card = shape as CardShape;
                this.updateCard(card, index);

                card.on('click', () => {
                    if (this.selected.includes(index)) {
                        this.selected = this.selected.filter(v => v != index);
                    } else {
                        this.selected.push(index);
                    }

                    this.updateCard(card, index);
                    this.updateButton();
                });
            });

            fadeShape.on('click', () => {
                this.destructModal();

                resolve(undefined);
            });

            this.modalGroup.add(fadeShape, backgroundShape, titleShape, this.buttonShape, cardShapes);
            this.scene.add(this.modalGroup);
        });
    }

    private destructModal() {
        this.modalGroup?.destroy();
        this.buttonShape = undefined;
        this.modalGroup = undefined;
    }

    private validateCount(count: number): CountBoundaryValidationResult {
        switch (this.count.type) {
            case BoundaryType.AT_LEAST: {
                if (count >= this.count.count) {
                    return {verdict: "correct"};
                } else {
                    return {verdict: "error", error: `Выбрано недостаточно карт (${count} < ${this.count.count})`};
                }
            }
            case BoundaryType.EQUAL: {
                if (count == this.count.count) {
                    return {verdict: "correct"};
                } else {
                    return {
                        verdict: "error",
                        error: `Выбрано неправильное количество (${count} != ${this.count.count})`
                    };
                }
            }
            case BoundaryType.NO_MORE_THAN: {
                if (count <= this.count.count) {
                    return {verdict: "correct"};
                } else {
                    return {
                        verdict: "error",
                        error: `Выбрано слишком много карт (${count} > ${this.count.count})`
                    };
                }
            }
        }
    }

    private updateButton() {
        const validationResult = this.validateCount(this.selected.length);

        if (validationResult.verdict === "correct") {
            this.buttonShape.setAttrs({
                text: "готово",
                fill: Color.WHITE.toString()
            });
        } else {
            this.buttonShape.setAttrs({
                text: validationResult.error,
                fill: COLORS.TEXT_DANGER.toString()
            });
        }
    }

    private updateCard(card: CardShape, index: number) {
        if (this.selected.includes(index)) {
            card.setStrokeWidth(5).setStroke(Color.fromHex('#FF9F1C').toString());
        } else {
            card.strokeWidth(0);
        }
    }
}