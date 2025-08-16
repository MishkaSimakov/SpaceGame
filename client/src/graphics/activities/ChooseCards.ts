import {Event} from "@common/events/Event";
import Vector2 from "@common/Vector2";
import Module from "@common/modules/Module";

import Color from "../Color";
import Controls from "../scenes/Controls";
import {Activity} from "./Activity";
import {COLORS} from "../constants";
import {BoundaryType, CountBoundary, CountBoundaryValidationResult} from "../CountBoundary";
import {Group} from "konva/lib/Group";
import {Rect} from "konva/lib/shapes/Rect";
import {Text} from "konva/lib/shapes/Text";
import {getBackground} from "../shapes/ModalBackground";
import {ModuleShape} from "../shapes/Card";

export class ChooseCardsActivity extends Activity {
    private modalGroup?: Group = undefined;
    private buttonShape?: Text = undefined;
    private resolveModal: Function | undefined = undefined;

    private selected: number[] = [];

    constructor(private scene: Controls, private title: string, private count: CountBoundary, private cards: (Event | Module)[]) {
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

            const fadeShape = new Rect({
                x: 0,
                y: 0,
                width: sceneWidth,
                height: sceneHeight,
                fill: Color.fromHex('#000000', 0.75).toString()
            });

            const titleShape = new Text({
                x: sceneWidth / 2,
                y: cardShapes.getClientRect().y - 15,
                text: this.title,
                originX: 0.5,
                originY: 1,
                fill: "white",
                fontFamily: "Exo2Bold",
                fontSize: 20
            });

            this.buttonShape = new Text({
                x: sceneWidth / 2,
                y: cardShapes.getClientRect().y + cardShapes.getClientRect().height + 15,
                text: "",
                fontFamily: "Exo2Bold",
                originX: 0.5
            });
            this.buttonShape.on('pointerdown', () => {
                const validationResult = this.validateCount(this.selected.length);

                if (validationResult.verdict === "correct") {
                    this.destructModal();
                    resolve(this.selected);
                }
            });
            this.updateButton();

            const backgroundShape = getBackground(titleShape, cardShapes, this.buttonShape);

            cardShapes.children.forEach((shape, index) => {
                const card = shape as ModuleShape;
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
                fill: "white"
            });
        } else {
            this.buttonShape.setAttrs({
                text: validationResult.error,
                fill: COLORS.TEXT_DANGER
            });
        }
    }

    private updateCard(card: ModuleShape, index: number) {
        if (this.selected.includes(index)) {
            card.setStrokeWidth(5).setStroke(Color.fromHex('#FF9F1C').toString());
        } else {
            card.setStrokeWidth(0);
        }
    }
}