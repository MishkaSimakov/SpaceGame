import Scene from "../engine/Scene";
import {Group} from "../engine/Group";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import Color from "../Color";
import Game from "../../Game";

export default class PopupsScene extends Scene {
    private popups: Group[] = [];
    private gameManager: Game;

    constructor(game: Game) {
        super({
            // Ensure it's transparent and overlays without blocking lower scenes
            interactive: true, // Allow clicks on popups
        });

        this.gameManager = game;
    }

    /**
     * Creates a new popup with the given text and background color.
     * The popup will appear at the top center and disappear after the timeout (in ms) or when closed.
     * @param text The text to display in the popup.
     * @param color The background color of the popup.
     * @param timeout Optional timeout in milliseconds after which the popup auto-disappears.
     */
    addPopup(text: string, color: Color, timeout?: number): Group {
        const popupGroup = new Group();

        const padding = 10;
        const fontSize = 15;

        // Text element
        const popupText = new Text({
            text: text,
            fontFamily: "Exo2Regular",
            fontSize: fontSize,
            fill: "white",
            x: padding,
            y: padding,
            align: "left",
        });

        // Calculate dimensions based on text
        const textRect = popupText.getClientRect();
        const popupWidth = textRect.width + padding * 2;
        const popupHeight = textRect.height + padding * 2;

        // Background rectangle
        const background = new Rectangle({
            width: popupWidth,
            height: popupHeight,
            fill: color.toString(),
            strokeWidth: 2,
            cornerRadius: 10,
        });

        popupGroup.add(background, popupText);
        popupGroup.on('click', () => this.removePopup(popupGroup));

        this.add(popupGroup);
        this.popups.push(popupGroup);

        // Auto-disappear if timeout is provided
        if (timeout) {
            setTimeout(() => this.removePopup(popupGroup), timeout);
        }

        // Position all popups (including this new one)
        this.update();

        return popupGroup;
    }

    private removePopup(popup: Group) {
        const index = this.popups.indexOf(popup);
        if (index !== -1) {
            this.popups.splice(index, 1);
            popup.destroy();
            this.update(); // Reposition remaining popups
        }
    }

    /**
     * Recalculates sizes and positions of all popups based on current scene dimensions.
     * Popups are stacked vertically at the top center.
     */
    update() {
        const sceneWidth = this.width();
        const verticalSpacing = 10; // Space between stacked popups
        let currentY = 20; // Start from top with some margin

        this.popups.forEach((popup) => {
            const popupRect = popup.getClientRect();
            const posX = (sceneWidth - popupRect.width) / 2; // Center horizontally

            popup.setPosition({
                x: posX,
                y: currentY,
            });

            currentY += popupRect.height + verticalSpacing;
        });
    }
}