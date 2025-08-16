import {Rect} from "konva/lib/shapes/Rect";
import {Group} from "konva/lib/Group";
import {ContainerConfig} from "konva/lib/Container";
import {ButtonColors} from "../constants";
import {Text} from "konva/lib/shapes/Text";
import Color from "../Color";

type ButtonConfig = ContainerConfig & {
    text: string;
    colors: ButtonColors
}

export class Button extends Group {
    private readonly colors: ButtonColors;

    private backgroundShape: Rect;
    private textShape: Text;
    private disabledRect?: Rect = undefined;

    private state: 'DEFAULT' | 'HOVER' | 'ACTIVE' | 'DISABLED' = 'DEFAULT';

    constructor(config: ButtonConfig) {
        super(config);

        this.colors = config.colors;

        const width = this.width();
        const height = this.height();

        this.backgroundShape = new Rect({
            width: width,
            height: height
        });

        this.textShape = new Text({
            x: width / 2,
            y: height / 2,
            text: config.text,
            fill: "white",
            fontFamily: "Exo2Bold",
            fontSize: 12,

            align: "center",
            verticalAlign: "middle",
        });
        this.textShape.offsetX(this.textShape.width() / 2);
        this.textShape.offsetY(this.textShape.height() / 2);

        this.add(this.backgroundShape, this.textShape);

        if (this.isPointerInside()) {
            this.state = 'HOVER';
        }

        this.updateFill();

        this.on('pointerenter', () => {
            if (this.state !== 'ACTIVE' && this.state !== 'DISABLED') {
                this.state = 'HOVER';

                this.updateFill();
            }
        });

        this.on('pointerout', () => {
            if (this.state !== 'DISABLED') {
                this.state = 'DEFAULT';

                this.updateFill();
            }
        });

        this.on('pointerdown', () => {
            if (this.state !== 'DISABLED') {
                this.state = 'ACTIVE';

                this.updateFill();
            }
        });

        this.on('pointerup', () => {
            if (this.state !== 'DISABLED') {
                this.state = 'HOVER';

                this.updateFill();
            }
        });
    }

    private isPointerInside() {
        const pointerPosition = this.getRelativePointerPosition();

        if (!pointerPosition) {
            return false;
        }

        return 0 <= pointerPosition.x && pointerPosition.x <= this.width()
            && 0 <= pointerPosition.y && pointerPosition.y <= this.height();
    }

    private updateFill() {
        const pointerStyle = {
            DEFAULT: 'default',
            HOVER: 'pointer',
            ACTIVE: 'pointer',
        }

        if (this.state !== "DISABLED") {
            document.body.style.cursor = pointerStyle[this.state];
            this.backgroundShape.fill(this.colors[this.state].toString());
        }
    }

    isDisabled() {
        return this.state === 'DISABLED';
    }

    disabled(value: boolean) {
        if (value === this.isDisabled()) {
            return;
        }

        if (value) {
            this.state = 'DISABLED';

            this.disabledRect = new Rect({
                x: 0,
                y: 0,
                fill: Color.fromRGBA(0, 0, 0, 0.5).toString(),
                width: this.width(),
                height: this.height(),
                visible: true,
                interactive: true
            });

            this.add(this.disabledRect);
        } else {
            this.state = this.isPointerInside() ? 'HOVER' : 'DEFAULT';

            this.disabledRect.destroy();
            this.disabledRect = undefined;
        }

        this.updateFill();
    }
}
