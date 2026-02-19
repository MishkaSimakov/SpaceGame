import {Activity} from "./Activity";
import Controls from "../scenes/Controls";
import {Rectangle} from "../engine/shapes/Rectangle";
import Color from "../Color";
import {Text} from "../engine/shapes/Text";

export class ShowHugeMessageActivity extends Activity {
    private textShape: Text;
    private backgroundShape: Rectangle;
    private fadeShape: Rectangle;

    constructor(private scene: Controls, private text: string) {
        super();
    }

    activate() {
        return new Promise<void>(resolve => {
            this.textShape = new Text({
                text: this.text,
                originX: 0.5,
                originY: 0.5,
                fill: Color.WHITE.toString(),
                align: "center",
                fontFamily: "Exo2Bold",
                fontSize: 40
            });

            this.fadeShape = new Rectangle({
                fill: Color.fromHex('#000000', 0.75).toString()
            });

            this.backgroundShape = new Rectangle({
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

        this.backgroundShape.setAttrs({
            x: this.textShape.getClientRect().left - offset,
            y: this.textShape.getClientRect().top - offset,
            width: this.textShape.getClientRect().right - this.textShape.getClientRect().left + 2 * offset,
            height: this.textShape.getClientRect().bottom - this.textShape.getClientRect().top + 2 * offset,
        });
    }
}