import {Card, ModuleCard, OtherPlayer, Player, PlayerId, Vector2} from "@common/Types";
import {CardGetters} from "@common/getters/Card";
import {ModuleGetters} from "@common/getters/Module";

import * as assert from "../../../assert";
import {Board, CardId} from "./Board";
import {Chunk} from "./Chunk";

/**
 * Folding a new server state into the board.
 *
 * The server is authoritative about *which* cards exist, what each one is, and where it lives; the
 * board is authoritative about *arrangement*. Reconciling drapes the arrangement back over the new
 * truth, keeping every card that has not actually moved exactly where the player left it.
 *
 *   server owns   which cards exist; each card's data; the zone it is in;
 *                 the module layout of any real ship (that layout IS the ship)
 *   board owns    hand order; which fragment a card sits in and where; chunk positions on screen
 *
 * A non-main chunk is a *fragment*: to the game those cards are in the player's hand, pre-assembled
 * on the field for convenience. So the server's `hand` corresponds to the board's hand cards plus
 * every fragment, and a card moving between hand and fragment is not a zone change at all.
 *
 * While the player is rebuilding, their edits are not yet submitted and the incoming state is stale
 * with respect to them, so their zones are left alone; only membership and card data are applied.
 */

/** Where a player's ship goes when it first appears, in card units. The local player takes slot 0. */
const SHIP_POSITIONS: Vector2[] = [
    {x: 0, y: 0}, {x: 0, y: -6}, {x: 6, y: 0}, {x: -6, y: 0}, {x: 0, y: 6}
];

/** A card as the server sees it: the card itself, and whose ship it is on (absent ⇒ in hand). */
type ServerCard = {
    card: Card,
    owner?: PlayerId
};

function indexServerCards(player: Player, otherPlayers: OtherPlayer[]): Map<CardId, ServerCard> {
    const index = new Map<CardId, ServerCard>();

    for (const card of player.hand) {
        index.set(CardGetters.id(card), {card});
    }

    for (const module of player.spaceship.modules) {
        index.set(module.id, {card: ModuleGetters.asCard(module), owner: player.id});
    }

    for (const other of otherPlayers) {
        for (const module of other.spaceship.modules) {
            index.set(module.id, {card: ModuleGetters.asCard(module), owner: other.id});
        }
    }

    return index;
}

/**
 * Copies the server's card into the board, keeping the board's own layout for the module unless the
 * server's layout is the authoritative one.
 *
 * It is authoritative for a real ship — a ship's module coordinates *are* server state. It is
 * meaningless for a hand card, whose stored coordinates are leftovers from wherever it last sat, so
 * for those the board's arrangement stands.
 */
function applyServerCard(board: Board, serverCard: Card, adoptLayout: boolean) {
    const id = CardGetters.id(serverCard);
    const info = board.getCard(id);

    assert.ok(info !== undefined);

    const previous = CardGetters.asModule(info.card);
    info.card = structuredClone(serverCard);

    const module = CardGetters.asModule(info.card);

    if (!adoptLayout && module !== undefined && previous !== undefined) {
        module.x = previous.x;
        module.y = previous.y;
        module.rotation = previous.rotation;
    }
}

/**
 * The chunk a player's ship lives in, creating it at a free slot if they have none.
 *
 * Only ever their *main* chunk: a fragment must never be adopted as the ship, or the ship would
 * inherit the fragment's position and swallow the loose cards sitting in it.
 */
function shipChunk(board: Board, owner: PlayerId): Chunk {
    const main = board.getMainChunk(owner);

    if (main !== undefined) {
        return main;
    }

    const taken = new Set(board.getChunks().map(c => c.owner));
    return board.createChunk(owner, SHIP_POSITIONS[taken.size % SHIP_POSITIONS.length]);
}

function putOnField(board: Board, module: ModuleCard, chunk: Chunk) {
    const info = board.getCard(module.id);

    if (info === undefined) {
        board.addCard(structuredClone(ModuleGetters.asCard(module)), {type: "chunk", chunk: chunk.id});
        return;
    }

    if (info.location.type === "chunk" && info.location.chunk === chunk.id) {
        return;
    }

    board.addCardToChunk(module.id, chunk.id, ModuleGetters.position(CardGetters.asModule(info.card)!));
}

function putInHand(board: Board, card: Card) {
    const id = CardGetters.id(card);
    const info = board.getCard(id);

    if (info === undefined) {
        board.addCard(structuredClone(card), {type: "hand", index: board.getHand().length});
        return;
    }

    // already in hand, or pre-assembled in a fragment — a fragment IS the hand, so leave it be
    if (info.location.type === "hand") {
        return;
    }

    if (info.location.type === "chunk" && !board.hasMainModule(info.location.chunk)) {
        return;
    }

    board.pushToHand(id);
}

export function reconcile(board: Board, player: Player, otherPlayers: OtherPlayer[]) {
    // A drag is a gesture in flight; resolving it is the view's job, and a reconcile underneath it
    // would move the card out from under the pointer. The view defers until the drag ends.
    assert.ok(
        board.getCards().every(info => info.location.type !== "drag"),
        "cannot reconcile while a card is being dragged"
    );

    board.setThisPlayer(player.id);

    const server = indexServerCards(player, otherPlayers);
    const rebuilding = board.getCanRebuild();

    // cards the server no longer has are gone: destroyed, discarded, or captured
    for (const info of board.getCards()) {
        const id = CardGetters.id(info.card);

        if (!server.has(id)) {
            board.removeCard(id);
        }
    }

    // The local ship goes first so that it claims ship slot 0 — the player's own ship belongs at
    // the origin. Mid-rebuild their uncommitted layout stands, so the server's is taken only when
    // they are not rebuilding.
    if (player.spaceship.modules.length > 0) {
        const chunk = shipChunk(board, player.id);

        for (const module of player.spaceship.modules) {
            const isNew = board.getCard(module.id) === undefined;

            if (isNew || !rebuilding) {
                putOnField(board, module, chunk);
            }

            applyServerCard(board, ModuleGetters.asCard(module), isNew || !rebuilding);
        }
    }

    // An opponent's field is exactly their ship, laid out the way the server says: we cannot
    // rearrange someone else's ship, so there is no arrangement of ours to preserve. This also
    // reclaims any module of ours they have just captured.
    for (const other of otherPlayers) {
        const chunk = shipChunk(board, other.id);

        for (const module of other.spaceship.modules) {
            putOnField(board, module, chunk);
            applyServerCard(board, ModuleGetters.asCard(module), true);
        }
    }

    for (const card of player.hand) {
        const isNew = board.getCard(CardGetters.id(card)) === undefined;

        if (isNew || !rebuilding) {
            putInHand(board, card);
        }

        applyServerCard(board, card, false);
    }

    // moves above can leave a chunk empty or split in two; both are repaired in one pass
    board.repairChunks();
}
