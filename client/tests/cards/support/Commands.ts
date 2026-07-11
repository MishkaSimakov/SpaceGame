import fc from "fast-check";

import {Card} from "@common/Types";
import {CardGetters} from "@common/getters/Card";

import {Board} from "../../../src/graphics/cards/model/Board";
import {reconcile} from "../../../src/graphics/cards/model/Reconcile";
import {IdAllocator} from "./Cards";
import {applyMutations, Mutation, mutationArb, ServerState} from "./ServerMutations";

/**
 * The things that can happen to a board while a game is being played: what the player does to it,
 * and what the server says about it.
 *
 * A command that cannot legally apply to the current board is skipped rather than forced — the aim
 * is to explore reachable states, and an illegal move is one the UI would never have offered.
 */

export type Command =
    { kind: "rotate", pick: number }
    | { kind: "reorderHand", pick: number, to: number }
    | { kind: "handToField", pick: number, x: number, y: number }
    | { kind: "fieldToHand", pick: number }
    | { kind: "moveChunk", pick: number, x: number, y: number }
    | { kind: "connectChunk", pick: number }
    | { kind: "startRebuild" }
    | { kind: "commitRebuild" }
    | { kind: "serverUpdate", mutations: Mutation[] };

const pickArb = fc.nat({max: 100});
const coordArb = fc.integer({min: -12, max: 12});

export const commandArb: fc.Arbitrary<Command> = fc.oneof(
    fc.record({kind: fc.constant("rotate" as const), pick: pickArb}),
    fc.record({kind: fc.constant("reorderHand" as const), pick: pickArb, to: pickArb}),
    fc.record({kind: fc.constant("handToField" as const), pick: pickArb, x: coordArb, y: coordArb}),
    fc.record({kind: fc.constant("fieldToHand" as const), pick: pickArb}),
    fc.record({kind: fc.constant("moveChunk" as const), pick: pickArb, x: coordArb, y: coordArb}),
    fc.record({kind: fc.constant("connectChunk" as const), pick: pickArb}),
    fc.record({kind: fc.constant("startRebuild" as const)}),
    fc.record({kind: fc.constant("commitRebuild" as const)}),
    fc.record({kind: fc.constant("serverUpdate" as const), mutations: fc.array(mutationArb, {maxLength: 3})})
);

export const commandsArb: fc.Arbitrary<Command[]> = fc.array(commandArb, {maxLength: 20});

/** Chunks the player is actually allowed to touch: their own, and the ship only while rebuilding. */
function modifiableChunks(board: Board) {
    return board.getModifiableChunks();
}

/**
 * Submitting a rebuild. The main chunk becomes the ship and everything else the player holds —
 * loose hand cards and every fragment — becomes the hand, which is what the server does with the
 * response.
 */
function commitRebuild(board: Board, server: ServerState) {
    const local = board.getThisPlayer();
    const main = board.getMainChunk(local);

    const shipModules = main ? board.getChunkModules(main.id) : [];
    const shipIds = new Set(shipModules.map(m => m.id));

    const held: Card[] = board.getCards()
        .filter(info => {
            const location = info.location;

            if (location.type === "hand") {
                return true;
            }

            if (location.type !== "chunk") {
                return false;
            }

            const chunk = board.getChunk(location.chunk)!;
            return chunk.owner === local && !shipIds.has(CardGetters.id(info.card));
        })
        .map(info => info.card);

    server.player.spaceship = structuredClone({modules: shipModules});
    server.player.hand = structuredClone(held);

    board.setCanRebuild(false);
}

export function runCommand(board: Board, server: ServerState, command: Command, ids: IdAllocator) {
    switch (command.kind) {
        case "rotate": {
            const candidates = board.getCards()
                .filter(info => info.card.cardType === "module" && board.isCardModifiable(CardGetters.id(info.card)));

            if (candidates.length === 0) {
                return;
            }

            board.rotateInPlace(CardGetters.id(candidates[command.pick % candidates.length].card));
            return;
        }

        case "reorderHand": {
            const hand = board.getHand();

            if (hand.length === 0) {
                return;
            }

            const card = hand[command.pick % hand.length];
            board.insertIntoHand(CardGetters.id(card.card), command.to % hand.length);
            return;
        }

        case "handToField": {
            const modules = board.getHand().filter(info => info.card.cardType === "module");

            if (modules.length === 0) {
                return;
            }

            const card = modules[command.pick % modules.length];
            const chunk = board.createChunk(board.getThisPlayer(), {x: command.x, y: command.y});

            // a card dropped on open field becomes a fragment of its own
            board.addCardToChunk(CardGetters.id(card.card), chunk.id, {x: 0, y: 0});
            return;
        }

        case "fieldToHand": {
            // the command module cannot be lifted off — it anchors the ship
            const candidates = modifiableChunks(board)
                .flatMap(chunk => board.getChunkCards(chunk.id))
                .filter(info => board.canDetachCard(CardGetters.id(info.card)));

            if (candidates.length === 0) {
                return;
            }

            const id = CardGetters.id(candidates[command.pick % candidates.length].card);

            board.removeCardFromChunk(id);
            board.pushToHand(id);
            return;
        }

        case "moveChunk": {
            const chunks = modifiableChunks(board);

            if (chunks.length === 0) {
                return;
            }

            board.moveChunk(chunks[command.pick % chunks.length].id, {x: command.x, y: command.y});
            return;
        }

        case "connectChunk": {
            const chunks = modifiableChunks(board);

            if (chunks.length === 0) {
                return;
            }

            const dragged = chunks[command.pick % chunks.length];
            const points = board.findConnectionPoints(dragged.id);

            if (points.length === 0) {
                return;
            }

            board.applySnap(dragged.id, points);
            board.mergeChunks(dragged.id, points);
            return;
        }

        case "startRebuild": {
            board.setCanRebuild(true);
            return;
        }

        case "commitRebuild": {
            if (!board.getCanRebuild()) {
                return;
            }

            commitRebuild(board, server);
            return;
        }

        case "serverUpdate": {
            applyMutations(server, command.mutations, ids);
            reconcile(board, server.player, server.otherPlayers);
            return;
        }
    }
}
