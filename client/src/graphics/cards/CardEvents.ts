import * as assert from "assert"

import {CardInfo} from "./CardInfo";
import {Chunk} from "./Chunk";

type CardEventsHandler = {
    onCardClick: (card: CardInfo) => void;
    onChunkSelect: (chunk: Chunk) => void;
    onChunkDeselect: (chunk: Chunk) => void;
    onDragStart: (card: CardInfo) => void;
    onDragMove: (card: CardInfo) => void;
    onDragEnd: (card: CardInfo) => void;
};

export class CardEvents {
    private readonly selectChunkDuration = 500;

    private isChunkSelected = false;
    private ignoreClickAfterChunkSelected = false;

    constructor(
        private readonly info: CardInfo
    ) {
    }

    attachEvents(handler: CardEventsHandler) {
        const shape = this.info.shape;

        shape.draggable(true).dragDistance(5);

        this.attachChunkSelectEvent(handler);

        shape.on('click', () => {
            if (this.ignoreClickAfterChunkSelected) {
                this.ignoreClickAfterChunkSelected = false;
                return;
            }

            this.logEvent("click");

            handler.onCardClick(this.info);
        });

        shape.on('pointerup', () => {
            if (this.isChunkSelected) {
                this.logEvent("chunkDeselect");

                assert.ok(this.info.location.type === "chunk");
                handler.onChunkDeselect(this.info.location.chunk);
            }
        });

        shape.on('dragstart', () => {
            this.logEvent("dragstart");

            handler.onDragStart(this.info);
        });

        shape.on('dragmove', () => {
            this.logEvent("dragmove");

            handler.onDragMove(this.info);
        });

        shape.on('dragend', () => {
            this.logEvent("dragend");

            this.isChunkSelected = false;
            this.ignoreClickAfterChunkSelected = false;

            handler.onDragEnd(this.info);
        });
    }

    private attachChunkSelectEvent(handler: CardEventsHandler) {
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined = undefined;

        this.info.shape.on('pointerdown', () => {
            timeoutHandle = setTimeout(() => {
                if (this.info.location.type === "chunk") {
                    this.logEvent("chunkSelect");

                    this.isChunkSelected = true;
                    this.ignoreClickAfterChunkSelected = true;

                    handler.onChunkSelect(this.info.location.chunk);
                }
            }, this.selectChunkDuration);
        });

        this.info.shape.on('pointerup pointerleave dragstart dragend', () => {
            clearTimeout(timeoutHandle);
        });
    }

    private logEvent(name: string) {
        console.log(name);
    }
}
