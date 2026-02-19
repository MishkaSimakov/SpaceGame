import {Card} from "@common/Types";

import Controls from "../scenes/Controls";
import Color from "@common/helpers/Color";
import {Group} from "../engine/Group";
import {Rectangle} from "graphics/engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import {Activity} from "./Activity";
import {getCardsGrid} from "../shapes/CardsGrid";

export class ShowCardsActivity extends Activity {
    private cardsShape?: Group;
    private titleShape?: Text;
    private fadeShape?: Rectangle;

    constructor(private scene: Controls, private cards: Card[], private title?: string) {
        super();
    }

    activate() {
        if (this.cards.length === 0) {
            return Promise.resolve();
        }

        return new Promise<void>(resolve => {
            this.fadeShape = this.scene.createAndAdd.rectangle({
                fill: Color.fromHex('#000000', 0.75).toString()
            });

            this.cardsShape = getCardsGrid(this.cards, this.scene.width(), this.scene.height());
            this.scene.add(this.cardsShape);

            if (this.title) {
                this.titleShape = this.scene.createAndAdd.text({
                    text: this.title,
                    originX: 0.5,
                    originY: 1,
                    fontFamily: "Exo2Bold",
                    fill: Color.WHITE.toString(),
                    fontSize: 20,
                });
            }

            this.setPositions();

            this.scene.getGraphics().once('pointerdown', () => {
                this.titleShape?.destroy();
                this.fadeShape.destroy();
                this.cardsShape.destroy();

                resolve();
            });
        });
    }

    update() {
        // TODO: update only size & position
        this.cardsShape.destroy();
        this.cardsShape = getCardsGrid(this.cards, this.scene.width(), this.scene.height());
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
            y: this.cardsShape.getClientRect().top - 15,
        });
    }
}