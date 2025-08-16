import Konva from "konva";
import Color from "../Color";

export default class PopupsLayer extends Konva.Layer {
    private popups: Konva.Group[] = [];

    constructor() {
        super({
            listening: true // allow clicks
        });
    }

    /**
     * Creates a new popup with the given text and background color.
     * @param text The text to display in the popup.
     * @param color The background color of the popup (CSS color string).
     * @param timeout Optional timeout in milliseconds after which the popup auto-disappears.
     */
    addPopup(text: string, color: Color, timeout?: number): Konva.Group {
        const popupGroup = new Konva.Group({
            listening: true,
            opacity: 0,      // start invisible
            y: -30           // start slightly above
        });

        const padding = 10;
        const fontSize = 15;

        const popupText = new Konva.Text({
            text: text,
            fontFamily: "Exo2Regular",
            fontSize: fontSize,
            fill: "white",
            x: padding,
            y: padding,
            align: "left"
        });

        const popupWidth = popupText.width() + padding * 2;
        const popupHeight = popupText.height() + padding * 2;

        const background = new Konva.Rect({
            width: popupWidth,
            height: popupHeight,
            fill: color.toString(),
            strokeWidth: 2,
            cornerRadius: 10
        });

        popupGroup.add(background);
        popupGroup.add(popupText);

        popupGroup.on("click", () => this.animateRemove(popupGroup));

        this.add(popupGroup);
        this.popups.push(popupGroup);

        // Auto-disappear if timeout is provided
        if (timeout) {
            setTimeout(() => this.animateRemove(popupGroup), timeout);
        }

        // Position all popups before animating
        this.updatePositions();

        // Animate fade-in + slide
        popupGroup.to({
            opacity: 1,
            y: popupGroup.y() + 30, // slide down into position
            duration: 0.3,
            easing: Konva.Easings.EaseOut
        });

        return popupGroup;
    }

    private animateRemove(popup: Konva.Group) {
        // Fade-out + slide up
        popup.to({
            opacity: 0,
            y: popup.y() - 20,
            duration: 0.25,
            easing: Konva.Easings.EaseIn,
            onFinish: () => this.removePopup(popup)
        });
    }

    private removePopup(popup: Konva.Group) {
        const index = this.popups.indexOf(popup);
        if (index !== -1) {
            this.popups.splice(index, 1);
            popup.destroy();
            this.updatePositions();
            this.draw();
        }
    }

    /**
     * Stack all popups vertically at the top center.
     */
    updatePositions() {
        const layerWidth = this.getStage()?.width() || 0;
        const verticalSpacing = 10;
        let currentY = 20;

        this.popups.forEach((popup) => {
            const rect = popup.getClientRect({relativeTo: this});
            const posX = (layerWidth - rect.width) / 2;

            popup.position({
                x: posX,
                y: currentY
            });

            currentY += rect.height + verticalSpacing;
        });

        this.batchDraw();
    }
}
