import {Card, ModuleCard, OtherPlayer, Player} from "@common/Types";
import {CardGetters} from "@common/getters/Card";

import {Board} from "../../../src/graphics/cards/model/Board";
import {validateBoard} from "../../../src/graphics/cards/model/Validate";

/**
 * The specification of a correct board, expressed as checks rather than examples.
 *
 * Each function returns the violations it found, empty meaning "sound". Property tests throw random
 * boards and server states at these; a violation names what broke so a shrunk counterexample is
 * readable.
 */

/**
 * Well-formedness of a board on its own, independent of any server state.
 *
 * Note a card in `drag` is legal here: a drag in progress is a valid state of the board.
 */
export function checkBoardInvariants(board: Board): string[] {
    return validateBoard(board);
}

/** Everything about a card the server owns. Position and rotation are the client's, so not here. */
function serverOwnedFields(card: Card): string {
    if (card.cardType === "event") {
        return JSON.stringify({id: card.event.id, type: card.event.type, description: card.event.description});
    }

    const m = card.module;
    return JSON.stringify({
        id: m.id, name: m.name, type: m.type, connectors: m.connectors,
        strength: m.strength, capacity: m.capacity, energyCost: m.energyCost,
        energyIncrease: m.energyIncrease, totalHealth: m.totalHealth, health: m.health,
        mainModuleType: m.mainModuleType
    });
}

/**
 * Agreement between a board and the server state it should be reflecting.
 *
 * Two things always hold: the board knows exactly the cards the server sent (membership), and each
 * card's server-owned data matches (a module's health must not go stale after combat).
 *
 * Where each card *sits* is stricter but conditional. Normally the local player's main chunk is
 * their ship and their hand cards plus every fragment are their hand. While they are rebuilding,
 * those edits have not been submitted yet and the incoming state is stale with respect to them, so
 * only membership is required — the split is the player's until they commit it.
 */
export function checkServerAgreement(board: Board, player: Player, otherPlayers: OtherPlayer[]): string[] {
    const violations: string[] = [];

    const local = board.getThisPlayer();

    const serverCards: Card[] = [
        ...player.hand,
        ...player.spaceship.modules.map(m => ({cardType: "module", module: m} as Card)),
        ...otherPlayers.flatMap(p => p.spaceship.modules).map(m => ({cardType: "module", module: m} as Card))
    ];

    const serverIds = new Set(serverCards.map(CardGetters.id));
    const boardIds = new Set(board.getCards().map(info => CardGetters.id(info.card)));

    for (const id of serverIds) {
        if (!boardIds.has(id)) {
            violations.push(`card ${id} is in the server state but not on the board`);
        }
    }

    for (const id of boardIds) {
        if (!serverIds.has(id)) {
            violations.push(`card ${id} is on the board but not in the server state`);
        }
    }

    // server-owned data must not go stale
    for (const serverCard of serverCards) {
        const id = CardGetters.id(serverCard);
        const info = board.getCard(id);

        if (info === undefined) {
            continue;
        }

        if (serverOwnedFields(info.card) !== serverOwnedFields(serverCard)) {
            violations.push(`card ${id} has stale data: ${serverOwnedFields(info.card)} != ${serverOwnedFields(serverCard)}`);
        }
    }

    // an opponent's field is exactly their ship
    for (const other of otherPlayers) {
        const fieldIds = board.getChunks()
            .filter(c => c.owner === other.id)
            .flatMap(c => board.getChunkModules(c.id))
            .map((m: ModuleCard) => m.id)
            .sort();

        const shipIds = other.spaceship.modules.map(m => m.id).sort();

        if (fieldIds.join(",") !== shipIds.join(",")) {
            violations.push(`opponent ${other.id} field [${fieldIds}] != server ship [${shipIds}]`);
        }
    }

    if (board.getCanRebuild()) {
        // uncommitted edits: the player owns the split until they submit it
        return violations;
    }

    const mainChunk = board.getMainChunk(local);
    const mainIds = (mainChunk ? board.getChunkModules(mainChunk.id).map(m => m.id) : []).sort();
    const shipIds = player.spaceship.modules.map(m => m.id).sort();

    if (mainIds.join(",") !== shipIds.join(",")) {
        violations.push(`local main chunk [${mainIds}] != server ship [${shipIds}]`);
    }

    // a fragment is a hand card that happens to be pre-assembled on the field
    const fragmentIds = board.getChunks()
        .filter(c => c.owner === local && c.id !== mainChunk?.id)
        .flatMap(c => board.getChunkCards(c.id))
        .map(info => CardGetters.id(info.card));

    const handIds = [...board.getHand().map(info => CardGetters.id(info.card)), ...fragmentIds].sort();
    const serverHandIds = player.hand.map(CardGetters.id).sort();

    if (handIds.join(",") !== serverHandIds.join(",")) {
        violations.push(`local hand+fragments [${handIds}] != server hand [${serverHandIds}]`);
    }

    return violations;
}
