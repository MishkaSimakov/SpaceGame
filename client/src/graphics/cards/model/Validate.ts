import {ModuleType} from "@common/Types";
import {CardGetters} from "@common/getters/Card";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import {Board} from "./Board";
import {Chunk} from "./Chunk";
import {hasBadConnection} from "./Connect";

/**
 * What it means for a board to be well-formed, independent of any server state.
 *
 * Written defensively: it must be able to inspect a board that is already broken — that is the whole
 * point of it — so it never uses the Board accessors that assume soundness.
 *
 * This exists at runtime, not just in tests, because a board restored from storage is untrusted
 * input. Reconcile assumes a well-formed board (it will assert on, say, an event card sitting in a
 * chunk), so anything loaded has to be checked before it is handed over.
 */
export function validateBoard(board: Board): string[] {
    const violations: string[] = [];

    const local = board.getThisPlayer();
    const chunks = board.getChunks();

    for (const info of board.getCards()) {
        const id = CardGetters.id(info.card);
        const location = info.location;

        if (location.type !== "chunk") {
            continue;
        }

        if (chunks.every(chunk => chunk.id !== location.chunk)) {
            violations.push(`card ${id} references missing chunk ${location.chunk}`);
        }

        if (info.card.cardType !== "module") {
            violations.push(`event card ${id} is on the field`);
        }
    }

    const handIndices = board.getCards()
        .filter(info => info.location.type === "hand")
        .map(info => (info.location as { index: number }).index)
        .sort((a, b) => a - b);

    if (handIndices.join(",") !== handIndices.map((_, i) => i).join(",")) {
        violations.push(`hand indices are not contiguous: [${handIndices.join(",")}]`);
    }

    const hasMain = (chunk: Chunk) => board.getChunkCards(chunk.id).some(info =>
        info.card.cardType === "module" && info.card.module.type === ModuleType.MainModule
    );

    for (const chunk of chunks) {
        const cards = board.getChunkCards(chunk.id);

        if (cards.length === 0) {
            violations.push(`chunk ${chunk.id} is empty`);
            continue;
        }

        // a chunk holding a non-module is already reported above; its geometry means nothing
        if (cards.some(info => info.card.cardType !== "module")) {
            continue;
        }

        const modules = cards.map(info => CardGetters.asModule(info.card)!);

        const cells = modules.map(module => `${module.x};${module.y}`);
        if (new Set(cells).size !== cells.length) {
            violations.push(`chunk ${chunk.id} has two modules on one cell`);
        }

        // A chunk is one connected group with matching connectors — but it need NOT satisfy
        // checkConfiguration, which also demands every module be attached to something. A fragment of
        // a single module is legal: it is a hand card lying on the field.
        const spaceship = {modules};

        if (SpaceshipGetters.getComponents(spaceship).length > 1) {
            violations.push(`chunk ${chunk.id} is not connected`);
        }

        if (hasBadConnection(spaceship)) {
            violations.push(`chunk ${chunk.id} has mismatched connectors`);
        }
    }

    const owners = new Set(chunks.map(chunk => chunk.owner));

    for (const owner of owners) {
        const mainChunks = chunks.filter(chunk => chunk.owner === owner && hasMain(chunk));

        if (mainChunks.length > 1) {
            violations.push(`player ${owner} has ${mainChunks.length} main chunks`);
        }

        // an opponent's hand is hidden, so their pre-assembled fragments are invisible to us: they
        // can only ever show their real ship
        if (owner !== local) {
            const ownerChunks = chunks.filter(chunk => chunk.owner === owner);

            if (ownerChunks.length !== 1) {
                violations.push(`opponent ${owner} has ${ownerChunks.length} chunks, expected exactly 1`);
            }

            if (mainChunks.length !== 1) {
                violations.push(`opponent ${owner} has no main chunk`);
            }
        }
    }

    return violations;
}
