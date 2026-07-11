import {Card, ModuleCard, ModuleType, PlayerId, Spaceship, Vector2} from "@common/Types";
import {CardGetters} from "@common/getters/Card";
import {ModuleGetters} from "@common/getters/Module";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {SpaceshipModifiers} from "@common/modifiers/Spaceship";

import * as assert from "../../../assert";
import {CardInfo, CardLocation} from "./CardInfo";
import {Chunk, ChunkId} from "./Chunk";
import {
    ChunkView,
    ConnectionPoint,
    getAutorotateTarget,
    getConnectionPoints,
    mergeSpaceships,
    moduleWorldPosition,
    snappedChunkPosition
} from "./Connect";

export type CardId = number;

/**
 * The board: every card the player can see, where it is, and how the field is grouped into chunks.
 *
 * Holds no graphics — no shapes, no pixels, no engine imports. The view mirrors this onto the
 * canvas and the server reconciles into it. That constraint is enforced by a test, and it is what
 * keeps the board pure and deterministic, so it can be property-tested without a canvas.
 *
 * Positions are in card units throughout (see Chunk.position).
 */
export class Board {
    private cards = new Map<CardId, CardInfo>();
    private chunks: Chunk[] = [];

    private nextChunkId: ChunkId = 1;

    private thisPlayer: PlayerId;
    private canRebuild = false;

    constructor(thisPlayer: PlayerId) {
        this.thisPlayer = thisPlayer;
    }

    // ---------------------------------------------------------------- cards

    getThisPlayer(): PlayerId {
        return this.thisPlayer;
    }

    setThisPlayer(player: PlayerId) {
        this.thisPlayer = player;
    }

    setCanRebuild(value: boolean) {
        this.canRebuild = value;
    }

    getCanRebuild(): boolean {
        return this.canRebuild;
    }

    getCard(id: CardId): CardInfo | undefined {
        return this.cards.get(id);
    }

    getCards(): CardInfo[] {
        return Array.from(this.cards.values());
    }

    addCard(card: Card, location: CardLocation): CardInfo {
        const id = CardGetters.id(card);
        assert.ok(!this.cards.has(id));

        const info: CardInfo = {card, location};
        this.cards.set(id, info);

        return info;
    }

    removeCard(id: CardId) {
        const info = this.cards.get(id);
        assert.ok(info !== undefined);

        if (info.location.type === "hand") {
            this.removeFromHand(id);
        } else if (info.location.type === "chunk") {
            this.removeCardFromChunk(id);
        }

        this.cards.delete(id);
    }

    // ----------------------------------------------------------------- hand

    /** Hand cards in player-visible order. */
    getHand(): CardInfo[] {
        return this.getCards()
            .filter(info => info.location.type === "hand")
            .sort((a, b) => (a.location as { index: number }).index - (b.location as { index: number }).index);
    }

    pushToHand(id: CardId) {
        this.insertIntoHand(id, this.getHand().length);
    }

    insertIntoHand(id: CardId, index: number) {
        const info = this.cards.get(id);
        assert.ok(info !== undefined);

        const hand = this.getHand().filter(c => c !== info);
        assert.ok(0 <= index && index <= hand.length);

        hand.splice(index, 0, info);

        info.location = {type: "hand", index};
        this.reindexHand(hand);
    }

    removeFromHand(id: CardId) {
        const info = this.cards.get(id);
        assert.ok(info !== undefined && info.location.type === "hand");

        const hand = this.getHand().filter(c => c !== info);

        info.location = {type: "drag"};
        this.reindexHand(hand);
    }

    /** Keeps hand indices contiguous — the invariant every hand mutation must restore. */
    private reindexHand(hand: CardInfo[]) {
        hand.forEach((info, index) => {
            info.location = {type: "hand", index};
        });
    }

    // --------------------------------------------------------------- chunks

    getChunks(): Chunk[] {
        return Array.from(this.chunks);
    }

    getChunk(id: ChunkId): Chunk | undefined {
        return this.chunks.find(c => c.id === id);
    }

    createChunk(owner: PlayerId, position: Vector2): Chunk {
        const chunk: Chunk = {
            id: this.nextChunkId++,
            owner,
            position: {x: position.x, y: position.y},
            activatedProtector: undefined
        };

        this.chunks.push(chunk);

        return chunk;
    }

    /**
     * Takes back a chunk that already has an id — how a stored board is rebuilt, since the cards in
     * it refer to their chunk by that id.
     */
    adoptChunk(chunk: Chunk) {
        assert.ok(this.getChunk(chunk.id) === undefined);

        this.chunks.push({
            id: chunk.id,
            owner: chunk.owner,
            position: {x: chunk.position.x, y: chunk.position.y},
            activatedProtector: chunk.activatedProtector
        });

        this.nextChunkId = Math.max(this.nextChunkId, chunk.id + 1);
    }

    destroyChunk(id: ChunkId) {
        assert.ok(this.getChunkCards(id).length === 0);

        this.chunks = this.chunks.filter(c => c.id !== id);
    }

    /** Moves a whole chunk. The modules keep their coordinates within it, so nothing shifts inside. */
    moveChunk(id: ChunkId, position: Vector2) {
        const chunk = this.getChunk(id);
        assert.ok(chunk !== undefined);

        chunk.position = {x: position.x, y: position.y};
    }

    getChunkCards(id: ChunkId): CardInfo[] {
        return this.getCards().filter(c => c.location.type === "chunk" && c.location.chunk === id);
    }

    getChunkModules(id: ChunkId): ModuleCard[] {
        return this.getChunkCards(id).map(info => {
            const module = CardGetters.asModule(info.card);

            // only modules go on the field; without this the undefined travels into the connection
            // getters and fails there instead, a long way from whatever put it in the chunk
            assert.ok(module !== undefined, `chunk ${id} holds a card that is not a module`);

            return module;
        });
    }

    getChunkSpaceship(id: ChunkId): Spaceship {
        return {
            modules: this.getChunkModules(id),
            activatedProtector: this.getChunk(id)?.activatedProtector
        };
    }

    getChunkView(id: ChunkId): ChunkView {
        const chunk = this.getChunk(id);
        assert.ok(chunk !== undefined);

        return {id, position: chunk.position, spaceship: this.getChunkSpaceship(id)};
    }

    hasMainModule(id: ChunkId): boolean {
        return this.getChunkModules(id).some(m => m.type === ModuleType.MainModule);
    }

    /** The chunk holding a player's command module — their real ship. */
    getMainChunk(player: PlayerId): Chunk | undefined {
        return this.chunks.find(c => c.owner === player && this.hasMainModule(c.id));
    }

    /**
     * The main chunk may only be rearranged during the rebuild phase; detached fragments are
     * always fair game.
     */
    isChunkModifiable(id: ChunkId): boolean {
        const chunk = this.getChunk(id);

        if (chunk === undefined || chunk.owner !== this.thisPlayer) {
            return false;
        }

        return this.canRebuild || !this.hasMainModule(id);
    }

    isCardModifiable(id: CardId): boolean {
        const info = this.cards.get(id);
        assert.ok(info !== undefined);

        return info.location.type !== "chunk" || this.isChunkModifiable(info.location.chunk);
    }

    /**
     * Whether the player may lift this card off the field.
     *
     * Never the command module: it anchors the ship, and the server rejects a rebuild whose ship
     * does not contain it (`checkConfiguration` defaults to requiring the main module). The chunk
     * as a whole can still be dragged — that moves the ship without detaching anything.
     *
     * This is about what the *player* may do. Reconcile still removes a command module the server
     * says is gone, which is how a defeated player's ship leaves the board.
     */
    canDetachCard(id: CardId): boolean {
        const info = this.cards.get(id);
        assert.ok(info !== undefined);

        const module = CardGetters.asModule(info.card);

        if (module === undefined || module.type === ModuleType.MainModule) {
            return false;
        }

        return this.isCardModifiable(id);
    }

    getModifiableChunks(exclude?: ChunkId): Chunk[] {
        return this.chunks.filter(c => c.id !== exclude && this.isChunkModifiable(c.id));
    }

    // ------------------------------------------------- chunk membership

    addCardToChunk(id: CardId, chunkId: ChunkId, position?: Vector2) {
        const info = this.cards.get(id);
        assert.ok(info !== undefined && info.card.cardType === "module");
        assert.ok(this.getChunk(chunkId) !== undefined);

        if (info.location.type === "hand") {
            this.removeFromHand(id);
        }

        const target = position ?? ModuleGetters.position(info.card.module);

        info.card.module.x = target.x;
        info.card.module.y = target.y;
        info.location = {type: "chunk", chunk: chunkId};
    }

    /**
     * The player picking a card up off the field.
     *
     * Unlike `removeCardFromChunk`, which reconcile uses to take away whatever the server says is
     * gone, this is a *move* and so it obeys the rules: the command module cannot be picked up, and
     * neither can anything in a chunk the player may not rebuild.
     */
    liftCard(id: CardId) {
        assert.ok(this.canDetachCard(id), "this card cannot be taken off the field");

        this.removeCardFromChunk(id);
    }

    /** Lifts a card out of its chunk into `drag`, splitting the chunk if that disconnected it. */
    removeCardFromChunk(id: CardId) {
        const info = this.cards.get(id);
        assert.ok(info !== undefined && info.location.type === "chunk");

        const chunkId = info.location.chunk;
        info.location = {type: "drag"};

        this.updateChunkConnectedness(chunkId);
    }

    /**
     * Re-splits a chunk into its connected components, giving each new component its own chunk at
     * the same world position (so nothing visibly jumps). An emptied chunk is destroyed.
     */
    updateChunkConnectedness(id: ChunkId) {
        const chunk = this.getChunk(id);
        assert.ok(chunk !== undefined);

        const spaceship = this.getChunkSpaceship(id);

        if (spaceship.modules.length === 0) {
            this.destroyChunk(id);
            return;
        }

        const components = SpaceshipGetters.getComponents(spaceship);

        for (let i = 1; i < components.length; ++i) {
            // a fragment stays with whoever owned the ship it broke off — combat can split an
            // opponent's ship, and those pieces must not become modifiable by the local player
            const componentChunk = this.createChunk(chunk.owner, chunk.position);

            for (const module of components[i].modules) {
                const info = this.cards.get(module.id);
                assert.ok(info !== undefined);

                info.location = {type: "chunk", chunk: componentChunk.id};
            }
        }
    }

    /**
     * Destroys emptied chunks and splits any chunk that is no longer connected. Cheap to call after
     * a batch of moves, which is what lets a batch leave the board briefly inconsistent.
     */
    repairChunks() {
        for (const chunk of this.getChunks()) {
            this.updateChunkConnectedness(chunk.id);
        }
    }

    /** Absorbs the connected chunks into `primaryId`, then destroys them. */
    mergeChunks(primaryId: ChunkId, connectionPoints: ConnectionPoint[]) {
        if (connectionPoints.length === 0) {
            return;
        }

        const merged = mergeSpaceships(
            {spaceship: this.getChunkSpaceship(primaryId), offset: {x: 0, y: 0}},
            ...connectionPoints.map(cp => ({
                spaceship: this.getChunkSpaceship(cp.chunk),
                offset: cp.offset
            }))
        );

        for (const module of merged.modules) {
            this.addCardToChunk(module.id, primaryId, ModuleGetters.position(module));
        }

        for (const cp of connectionPoints) {
            this.destroyChunk(cp.chunk);
        }
    }

    // ------------------------------------------------------------ geometry

    /** Chunks the dragged chunk is allowed to snap onto. */
    private connectionCandidates(dragged: ChunkId): ChunkView[] {
        return this.getModifiableChunks(dragged).map(c => this.getChunkView(c.id));
    }

    /**
     * Which chunks `dragged` should snap onto right now, given where it currently sits.
     *
     * A chunk the player may not rebuild never snaps onto anything. Any chunk can be *moved* — where
     * it sits is only how this player has arranged their screen — but joining it to another is a
     * rebuild, and an opponent's ship is not theirs to rebuild.
     */
    findConnectionPoints(dragged: ChunkId): ConnectionPoint[] {
        if (!this.isChunkModifiable(dragged)) {
            return [];
        }

        return getConnectionPoints(this.getChunkView(dragged), this.connectionCandidates(dragged));
    }

    /**
     * Applies a snap: moves the dragged chunk onto the primary connection and lines the other
     * connected chunks up with it. Does not merge — the merge happens on drop.
     */
    applySnap(dragged: ChunkId, connectionPoints: ConnectionPoint[]) {
        assert.ok(connectionPoints.length > 0);

        const primary = connectionPoints[0];
        const primaryChunk = this.getChunkView(primary.chunk);

        const draggedChunk = this.getChunk(dragged)!;
        draggedChunk.position = snappedChunkPosition(primaryChunk, primary);

        for (let i = 1; i < connectionPoints.length; ++i) {
            const cp = connectionPoints[i];
            const chunk = this.getChunk(cp.chunk)!;

            chunk.position = {
                x: primaryChunk.position.x + cp.offset.x - primary.offset.x,
                y: primaryChunk.position.y + cp.offset.y - primary.offset.y
            };
        }
    }

    /**
     * The rotation a lone dragged module should turn to, if it is close enough to a chunk to start
     * fitting itself. Only a single module auto-rotates: turning a whole chunk under the pointer
     * would move every other module in it.
     */
    findAutorotateTarget(dragged: ChunkId): { rotation: number } | undefined {
        const modules = this.getChunkModules(dragged);

        if (modules.length !== 1 || !this.isChunkModifiable(dragged)) {
            return undefined;
        }

        const view = this.getChunkView(dragged);
        const world = moduleWorldPosition(view, modules[0]);

        return getAutorotateTarget(modules[0], world, this.connectionCandidates(dragged));
    }

    /** Rotates a card to its next legal orientation in place. */
    rotateInPlace(id: CardId) {
        const info = this.cards.get(id);
        assert.ok(info !== undefined);

        const module = CardGetters.asModule(info.card);

        if (module === undefined) {
            return;
        }

        if (info.location.type === "hand") {
            module.rotation = (module.rotation + 1) % 4;
            return;
        }

        if (info.location.type !== "chunk") {
            return;
        }

        // rotations that still fit the hole the module is currently sitting in
        const spaceship = this.getChunkSpaceship(info.location.chunk);
        SpaceshipModifiers.removeModule(spaceship, module);

        const possible = SpaceshipGetters.getPossibleRotationsFor(spaceship, module, module.x, module.y);

        if (possible.length > 0) {
            const next = (possible.indexOf(module.rotation) + 1) % possible.length;
            module.rotation = possible[next];
        }

        SpaceshipModifiers.addModule(spaceship, module, module.x, module.y);
    }
}
