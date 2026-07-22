import {CardShape} from "../shapes/CardShape";
import {CardId} from "./model/Board";

export type CardEventsHandler = {
    onCardClick(id: CardId): void;
    onChunkSelect(id: CardId): void;
    onChunkDeselect(id: CardId): void;
    onDragStart(id: CardId): void;
    onDragMove(id: CardId): void;
    onDragEnd(id: CardId): void;

    /** The pointer has rested on this card long enough to be asking what it does. */
    onDescribe(id: CardId): void;
    onStopDescribing(id: CardId): void;

    /** Whether this card is on the field, and so has a chunk that could be picked up. */
    isOnField(id: CardId): boolean;
};

/**
 * Turns pointer events on one card into the moves the board understands.
 *
 * Holding a card picks up its whole chunk — that is what the outline is announcing. The click that
 * would otherwise fire on release is swallowed, so a hold never also rotates the card.
 *
 * Resting the pointer on a card asks for its description. Touching the card takes the request back,
 * since the description would only be in the way of the gesture, and the wait starts over once the
 * gesture is done: a pointer left on the card is still asking.
 */
export class CardEvents {
    private readonly selectChunkDuration = 500;
    private readonly describeDuration = 700;

    private holdTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
    private describeTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
    private isChunkSelected = false;
    private swallowNextClick = false;

    constructor(
        private readonly id: CardId,
        private readonly shape: CardShape
    ) {
    }

    attach(handler: CardEventsHandler) {
        this.shape.draggable(true).dragDistance(5);

        this.shape.on('pointerdown', () => {
            this.holdTimeout = setTimeout(() => {
                if (!handler.isOnField(this.id)) {
                    return;
                }

                this.isChunkSelected = true;
                this.swallowNextClick = true;

                handler.onChunkSelect(this.id);
            }, this.selectChunkDuration);
        });

        this.shape.on('pointerup pointerleave dragstart dragend', () => {
            clearTimeout(this.holdTimeout);
        });

        this.shape.on('pointerup', () => {
            if (this.isChunkSelected) {
                handler.onChunkDeselect(this.id);
            }
        });

        this.shape.on('click', () => {
            if (this.swallowNextClick) {
                this.swallowNextClick = false;
                return;
            }

            handler.onCardClick(this.id);
        });

        this.shape.on('pointerover pointerup dragend', () => this.waitToDescribe(handler));

        this.shape.on('pointerleave pointerdown dragstart', () => {
            clearTimeout(this.describeTimeout);

            handler.onStopDescribing(this.id);
        });

        this.shape.on('dragstart', () => handler.onDragStart(this.id));
        this.shape.on('dragmove', () => handler.onDragMove(this.id));

        this.shape.on('dragend', () => {
            this.isChunkSelected = false;
            this.swallowNextClick = false;

            handler.onDragEnd(this.id);
        });
    }

    /**
     * Waits out the pause before the card describes itself.
     *
     * A gesture ends where it began — on the card — so this runs after one too, and the pause is
     * the same one the pointer waited the first time.
     */
    private waitToDescribe(handler: CardEventsHandler) {
        clearTimeout(this.describeTimeout);

        this.describeTimeout = setTimeout(() => {
            if (this.isUnderPointer()) {
                handler.onDescribe(this.id);
            }
        }, this.describeDuration);
    }

    /**
     * Whether the pointer is on the card now.
     *
     * A gesture can leave the card somewhere else entirely — dropped into a hand slot, or carried
     * off by the chunk it was torn from — and a card the pointer is no longer on is not being asked
     * about.
     */
    private isUnderPointer(): boolean {
        const rect = this.shape.getClientRect();

        return rect !== undefined && rect.contains(this.shape.getScene()?.getRelativePointerPosition());
    }

    /** The view calls this when it picks up a chunk itself, so the hold state stays in step. */
    markChunkSelected() {
        this.isChunkSelected = true;
    }
}
