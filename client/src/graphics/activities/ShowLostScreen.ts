import {Activity} from "./Activity";
import Controls from "../scenes/Controls";
import {Rectangle} from "../engine/shapes/Rectangle";
import Color from "../Color";
import {Text} from "../engine/shapes/Text";
import Vector2 from "@common/Vector2";

export class ShowLostScreenActivity extends Activity {
    private textShape: Text;
    private backgroundShape: Rectangle;
    private fadeShape: Rectangle;

    constructor(private scene: Controls) {
        super();
    }

    activate() {
        return new Promise<void>(resolve => {
            this.textShape = new Text({
                text: "Вы проиграли :(",
                originX: 0.5,
                originY: 0.5,
                fill: "white",
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
        const backgroundPosition1 = new Vector2(
            this.textShape.getClientRect().left - offset,
            this.textShape.getClientRect().top - offset
        );
        const backgroundPosition2 = new Vector2(
            this.textShape.getClientRect().right + offset,
            this.textShape.getClientRect().bottom + offset
        );

        this.backgroundShape.setAttrs({
            x: backgroundPosition1.x,
            y: backgroundPosition1.y,
            width: backgroundPosition2.x - backgroundPosition1.x,
            height: backgroundPosition2.y - backgroundPosition1.y,
        });
    }
}