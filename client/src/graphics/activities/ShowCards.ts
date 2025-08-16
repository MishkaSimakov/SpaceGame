import Module from "@common/modules/Module";
import {Event} from "@common/events/Event";

import Controls from "../scenes/Controls";
import Color from "../Color";
import {Activity} from "./Activity";

import {Group} from "konva/lib/Group";
import {Rect} from "konva/lib/shapes/Rect";
import {Text} from "konva/lib/shapes/Text";

export class ShowCardsActivity extends Activity {
    private cardsShape?: Group;
    private titleShape?: Text;
    private fadeShape?: Rect;

    constructor(private scene: Controls, private cards: (Module | Event)[], private title?: string) {
        super();
    }

    activate() {
        return new Promise<void>(resolve => {
            this.fadeShape = new Rect({
                fill: Color.fromHex('#000000', 0.75).toString()
            });
            this.scene.add(this.fadeShape);

            this.cardsShape = this.scene.drawCardsOnScreen(this.cards);
            this.scene.add(this.cardsShape);

            if (this.title) {
                this.titleShape = new Text({
                    text: this.title,
                    originX: 0.5,
                    originY: 1,
                    fontFamily: "Exo2Bold",
                    fill: "white",
                    fontSize: 20,
                });
                this.scene.add(this.titleShape);
            }

            this.setPositions();

            this.scene.on('pointerdown.close', () => {
                this.titleShape?.destroy();
                this.fadeShape.destroy();
                this.cardsShape.destroy();

                this.scene.off('pointerdown.close');

                resolve();
            });
        });
    }

    update() {
        // TODO: update only size & position
        this.cardsShape.destroy();
        this.cardsShape = this.scene.drawCardsOnScreen(this.cards);
        this.scene.add(this.cardsShape);

        this.setPositions();
    }

    private setPositions() {
        const sceneWidth = this.scene.width();
        const sceneHeight = this.scene.height();

        this.fadeShape.setAttrs({
            x: 0,
            y: 0,
            width: sceneWidth,
            height: sceneHeight
        });

        this.titleShape?.setAttrs({
            x: sceneWidth / 2,
            y: this.cardsShape.getClientRect().y - 15,
        });
    }
}