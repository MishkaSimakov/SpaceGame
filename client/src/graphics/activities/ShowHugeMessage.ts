import {Activity} from "./Activity";
import Controls from "../scenes/Controls";
import Color from "../Color";

import {Text} from "konva/lib/shapes/Text";
import {Rect} from "konva/lib/shapes/Rect";

export class ShowHugeMessageActivity extends Activity {
    private textShape: Text;
    private backgroundShape: Rect;
    private fadeShape: Rect;

    constructor(private scene: Controls, private text: string) {
        super();
    }

    activate() {
        return new Promise<void>(resolve => {
            this.textShape = new Text({
                text: this.text,
                originX: 0.5,
                originY: 0.5,
                fill: "white",
                fontFamily: "Exo2Bold",
                fontSize: 40
            });

            this.fadeShape = new Rect({
                fill: Color.fromHex('#000000', 0.75).toString()
            });

            this.backgroundShape = new Rect({
                fill: Color.fromHex('#0B2545', 0.75).toString(),
                stroke: Color.fromHex('#3D76BE').toString(),
                strokeWidth: 2
            });

            this.updatePositions();

            this.scene.on('click', () => {
                this.textShape.destroy();
                this.fadeShape.destroy();
                this.backgroundShape.destroy();

                resolve();
            });

            this.scene.add(this.fadeShape, this.backgroundShape, this.textShape);
        });
    }

    update() {
        this.updatePositions();
    }

    private updatePositions() {
        this.textShape.setPosition({
            x: this.scene.width() / 2,
            y: this.scene.height() / 2
        });

        this.fadeShape.setAttrs({
            x: 0,
            y: 0,
            width: this.scene.width(),
            height: this.scene.height()
        });

        const offset = 20;
        const textRect = this.textShape.getClientRect();

        this.backgroundShape.setAttrs({
            x: textRect.x - offset,
            y: textRect.y - offset,
            width: textRect.width + 2 * offset,
            height: textRect.height + 2 * offset,
        });
    }
}