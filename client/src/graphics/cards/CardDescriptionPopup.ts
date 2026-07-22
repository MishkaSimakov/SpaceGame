import {Card, GameSettings} from "@common/Types";
import {CardGetters} from "@common/getters/Card";
import Color from "@common/helpers/Color";

import {Group} from "../engine/Group";
import Scene from "../engine/Scene";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Text} from "../engine/shapes/Text";
import {BoundingRect, Vector2} from "../engine/types";
import {SIZES} from "../constants";

/** Space between the popup's frame and its text. */
const padding = 12;

/** Space between the title and the description, and between the popup and the card it describes. */
const gap = 8;

/** Space kept between the popup and the edges of the scene. */
const margin = 10;

/** Description text is wrapped at this width, so a long description grows downwards and not sideways. */
const textWidth = 260;

/**
 * The card description shown while the pointer rests on a card.
 *
 * One popup exists for the whole board and is moved and refilled for whichever card asks for it:
 * only one card can be under the pointer at a time. It draws into a scene of its own choosing —
 * whatever is given to it — because it has to sit above every card, including the ones in the hand.
 *
 * It takes no pointer events itself: it appears under the pointer's own path, and stealing hover
 * from the card would make it flicker away the moment it appeared.
 */
export class CardDescriptionPopup {
    private readonly scene: Scene;

    private readonly group: Group;
    private readonly background: Rectangle;
    private readonly title: Text;
    private readonly description: Text;

    constructor(scene: Scene) {
        this.scene = scene;

        this.group = new Group({
            visible: false,
            interactive: false
        });

        this.background = new Rectangle({
            fill: Color.fromHex('#0B2545', 0.95).toString(),
            stroke: Color.fromHex('#3D76BE').toString(),
            strokeWidth: 2,
            cornerRadius: SIZES.CORNER_RADIUS
        });

        this.title = new Text({
            x: padding,
            y: padding,
            fontFamily: "Exo2Bold",
            fontSize: 18,
            fill: Color.WHITE.toString(),
            maxWidth: textWidth
        });

        this.description = new Text({
            x: padding,
            fontFamily: "Exo2Regular",
            fontSize: 14,
            lineHeight: 1.3,
            fill: Color.WHITE.toString(),
            maxWidth: textWidth
        });

        this.group.add(this.background, this.title, this.description);
        this.scene.add(this.group);
    }

    /**
     * Shows what the card does under this game's settings, next to the rectangle it occupies on
     * screen.
     *
     * A card that has nothing to say beyond its stats shows nothing at all.
     */
    show(card: Card, settings: GameSettings, anchor: BoundingRect) {
        const module = CardGetters.asModule(card);
        const description = CardGetters.description(card, settings);

        if (module === undefined || description === undefined) {
            this.hide();
            return;
        }

        this.title.text(module.name);
        this.description.text(description);
        this.description.y(padding + this.title.getHeight() + gap);

        const width = Math.max(this.title.getWidth(), this.description.getWidth()) + 2 * padding;
        const height = this.description.y() + this.description.getHeight() + padding;

        this.background.setAttrs({width, height});

        this.group.setAttrs({
            ...this.position(anchor, width, height),
            visible: true
        });

        this.group.moveToTop();
    }

    hide() {
        this.group.visible(false);
    }

    /**
     * Where the popup fits.
     *
     * It goes beside the card rather than over it, on the side that has room for it; whatever room
     * is left after that decides the rest, since a description that runs off the screen describes
     * nothing. The controls column is not room: the board and the hand keep out of it, and a
     * description laid over the game log would be the only thing on screen that does not.
     */
    private position(anchor: BoundingRect, width: number, height: number): Vector2 {
        const clamp = (value: number, limit: number) => Math.max(margin, Math.min(value, limit));

        const rightEdge = this.scene.width() - SIZES.CONTROLS_WIDTH - margin;

        const beside = anchor.right + gap;
        const x = beside + width <= rightEdge ? beside : anchor.left - gap - width;

        return {
            x: clamp(x, rightEdge - width),
            y: clamp(anchor.top, this.scene.height() - margin - height)
        };
    }
}
