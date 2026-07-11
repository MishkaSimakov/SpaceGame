import {ModuleCard, ModuleType, OtherPlayer, Player, PlayerId, Spaceship, Vector2} from "@common/Types";
import {CardGetters} from "@common/getters/Card";
import {getDistance} from "@common/helpers/Vector";
import Color from "@common/helpers/Color";

import * as assert from "../../assert";
import {CountBoundary} from "../CountBoundary";
import {DD} from "../engine/Drag";
import {Group} from "../engine/Group";
import Scene from "../engine/Scene";
import {Line} from "../engine/shapes/Line";
import SpaceshipsScene from "../scenes/Spaceships";
import {CardShape} from "../shapes/CardShape";
import {CardEvents} from "./CardEvents";
import {FieldCard} from "./CardInfo";
import {ChooseModuleManager} from "./ChooseModuleManager";
import {HandManager} from "./HandManager";
import {getSpaceshipOutline} from "./ShipOutline";
import {Board, CardId} from "./model/Board";
import {ChunkId} from "./model/Chunk";
import {CONNECT_DISTANCE, ConnectionPoint} from "./model/Connect";
import {deserialize, serialize} from "./model/Persist";
import {reconcile} from "./model/Reconcile";

/**
 * Draws the board and turns the player's gestures back into moves on it.
 *
 * All the rules live in the board model; this holds no state of its own beyond the shapes standing
 * for cards and chunks, and the gesture currently in flight. Anything the player does is applied to
 * the board first and then drawn, so what is on screen is always something the board considers legal.
 */
type DragState = {
    kind: "chunk",
    chunk: ChunkId,
    /** Pointer offset within the chunk, in card units. */
    offset: Vector2,
    connections: ConnectionPoint[]
} | {
    kind: "hand",
    card: CardId,
    /** Pointer offset within the card, in pixels. */
    offset: Vector2
};

export class CardsManager {
    private readonly gameId: string;
    private readonly cardSize: number;
    private readonly outlineColor = Color.fromHex("#ffb703");

    private readonly spaceshipsScene: SpaceshipsScene;
    private readonly handScene: Scene;
    private readonly handManager: HandManager;

    private board: Board | undefined = undefined;

    private shapes = new Map<CardId, CardShape>();
    private events = new Map<CardId, CardEvents>();
    private groups = new Map<ChunkId, Group>();
    private outlines = new Map<ChunkId, Line[]>();

    private dragState: DragState | undefined = undefined;
    private selectedChunk: ChunkId | undefined = undefined;

    /** A state that arrived mid-gesture. Applied once the gesture finishes. */
    private pending: { player: Player, otherPlayers: OtherPlayer[] } | undefined = undefined;

    private choosing: ChooseModuleManager[] = [];

    constructor(gameId: string, spaceshipsScene: SpaceshipsScene, handScene: Scene) {
        this.gameId = gameId;

        this.spaceshipsScene = spaceshipsScene;
        this.handScene = handScene;

        this.cardSize = Math.max(this.spaceshipsScene.width() / 10, 75);
        this.handManager = new HandManager(this.handScene, this.cardSize);

        window["cardsManager"] = this;
    }

    // -------------------------------------------------------------- storage

    /**
     * Per game: a card id only means anything within the game that issued it, so one key shared
     * across games would let one game's arrangement be draped over another's cards.
     */
    private storageKey(): string {
        return `spaceships//cardsManager/${this.gameId}`;
    }

    /** The arrangement the player left behind, or nothing we can trust. */
    private restore(): Board | undefined {
        try {
            return deserialize(localStorage.getItem(this.storageKey()));
        } catch {
            // storage can be disabled outright; the game simply starts from a fresh arrangement
            return undefined;
        }
    }

    private persist() {
        if (this.board === undefined) {
            return;
        }

        try {
            localStorage.setItem(this.storageKey(), serialize(this.board));
        } catch {
            // full, or disabled: losing the arrangement is not worth losing the game over
        }
    }

    // ------------------------------------------------------------- the board

    private model(): Board {
        assert.ok(this.board !== undefined);
        return this.board;
    }

    setData(player: Player, otherPlayers: OtherPlayer[]) {
        // A drag is a gesture in flight; reconciling under it would move cards out from under the
        // pointer. The state is authoritative but it can wait until the player lets go.
        if (this.dragState !== undefined) {
            this.pending = {player, otherPlayers};
            return;
        }

        if (this.board === undefined) {
            // What was stored is only a hint: reconcile below overrules it wherever the game has
            // moved on. If there is nothing usable there, an empty board costs only the arrangement.
            this.board = this.restore() ?? new Board(player.id);
        }

        reconcile(this.board, player, otherPlayers);
        this.sync();
    }

    canRebuildSpaceship(value: boolean) {
        this.model().setCanRebuild(value);
        this.sync();
    }

    getSpaceship(): Spaceship | undefined {
        const board = this.model();
        const main = board.getMainChunk(board.getThisPlayer());

        return main === undefined ? undefined : board.getChunkSpaceship(main.id);
    }

    getPlayerSpaceshipPosition(id: PlayerId): Vector2 | undefined {
        const board = this.model();
        const main = board.getMainChunk(id);

        if (main === undefined) {
            return undefined;
        }

        const module = board.getChunkModules(main.id).find(m => m.type === ModuleType.MainModule)!;

        return {
            x: (main.position.x + module.x) * this.cardSize + this.cardSize / 2,
            y: (main.position.y + module.y) * this.cardSize + this.cardSize / 2
        };
    }

    resize() {
        this.handManager.resize();
    }

    // ------------------------------------------------------- coordinate frames

    private toPixels(position: Vector2): Vector2 {
        return {x: position.x * this.cardSize, y: position.y * this.cardSize};
    }

    /** The pointer, in the board's card units. */
    private pointerInModel(): Vector2 {
        const absolute = this.spaceshipsScene.getGraphics().getPointerPosition();
        const scene = this.spaceshipsScene.getTransform().invert().point(absolute);

        return {x: scene.x / this.cardSize, y: scene.y / this.cardSize};
    }

    // ----------------------------------------------------------------- drawing

    /**
     * Brings the scene into line with the board: creates, destroys and reparents, then lays out.
     *
     * A chunk's group owns its cards' shapes as children, so a dead group is only destroyed once its
     * cards have been reparented out of it — destroying it first would take living cards down with
     * it. That is why the passes run in this order and not the obvious one.
     */
    private sync() {
        const board = this.model();

        for (const chunk of board.getChunks()) {
            if (!this.groups.has(chunk.id)) {
                this.groups.set(chunk.id, this.spaceshipsScene.createAndAdd.group(this.toPixels(chunk.position)));
            }
        }

        const liveCards = new Set(board.getCards().map(info => CardGetters.id(info.card)));
        for (const [id, shape] of Array.from(this.shapes)) {
            if (!liveCards.has(id)) {
                shape.destroy();
                this.shapes.delete(id);
                this.events.delete(id);
            }
        }

        for (const info of board.getCards()) {
            const id = CardGetters.id(info.card);

            let shape = this.shapes.get(id);

            if (shape === undefined) {
                shape = new CardShape({card: info.card, size: this.cardSize, originX: 0, originY: 0});

                this.shapes.set(id, shape);

                const events = new CardEvents(id, shape);
                events.attach(this.handler());
                this.events.set(id, events);
            }

            // the server owns a card's health and stats; without this a damaged module keeps the
            // colour and the numbers it was drawn with
            shape.updateCard(info.card);

            if (info.location.type === "chunk") {
                const group = this.groups.get(info.location.chunk)!;

                if (shape.getParent() !== group) {
                    shape.moveTo(group);
                }
            } else if (info.location.type === "hand") {
                this.handManager.adopt(shape);
            } else {
                // Being dragged: it belongs to no chunk and to no hand. It still has to be parented
                // somewhere, or it goes down with the empty chunk group it was lifted out of — so it
                // hangs off the hand's scene, staying exactly where the pointer left it.
                if (shape.getParent() !== this.handScene) {
                    const absolute = shape.getAbsolutePosition();

                    shape.moveTo(this.handScene);
                    shape.setAbsolutePosition(absolute);
                }
            }
        }

        // now that no living card is parented to them, the groups of dead chunks can go
        const liveChunks = new Set(board.getChunks().map(c => c.id));
        for (const [id, group] of Array.from(this.groups)) {
            if (!liveChunks.has(id)) {
                this.clearOutline(id);
                group.destroy();
                this.groups.delete(id);
            }
        }

        this.handManager.setCards(
            board.getHand().map(info => this.shapes.get(CardGetters.id(info.card))!)
        );

        this.layout();
        this.applyStates();

        // mid-gesture the arrangement is still in the player's hand, so it is not worth storing yet
        if (this.dragState === undefined) {
            this.persist();
        }
    }

    /** Positions and rotations only — cheap enough to run on every pointer move. */
    private layout() {
        const board = this.model();

        for (const chunk of board.getChunks()) {
            this.groups.get(chunk.id)!.setPosition(this.toPixels(chunk.position));
        }

        for (const info of board.getCards()) {
            const id = CardGetters.id(info.card);
            const shape = this.shapes.get(id)!;
            const module = CardGetters.asModule(info.card);

            if (module === undefined) {
                continue;
            }

            if (info.location.type === "chunk") {
                shape.setPosition(this.toPixels({x: module.x, y: module.y}));
            }

            shape.rotateCard(module.rotation * (Math.PI / 2), 0);
        }
    }

    /**
     * The chunks that read as a real ship.
     *
     * A chunk snapped onto the ship counts already, even though it is not merged until the player
     * lets go: it is sitting in its berth, so it should look like it belongs there rather than stay
     * dimmed until release.
     */
    private shipChunks(): Set<ChunkId> {
        const board = this.model();

        const ships = new Set(
            board.getChunks().filter(chunk => board.hasMainModule(chunk.id)).map(chunk => chunk.id)
        );

        if (this.dragState?.kind !== "chunk" || this.dragState.connections.length === 0) {
            return ships;
        }

        const snapped = [this.dragState.chunk, ...this.dragState.connections.map(c => c.chunk)];

        if (snapped.some(id => ships.has(id))) {
            snapped.forEach(id => ships.add(id));
        }

        return ships;
    }

    /**
     * Dims what the player cannot act on: fragments are dimmed against the real ship, and while a
     * selection is running, so is every module that cannot be picked.
     */
    private applyStates() {
        const board = this.model();
        const ships = this.shipChunks();

        for (const chunk of board.getChunks()) {
            const isShip = ships.has(chunk.id);

            for (const card of this.fieldCards(chunk.id)) {
                if (!isShip) {
                    card.shape.setState('DISABLED');
                    continue;
                }

                if (this.choosing.length === 0) {
                    card.shape.setState('DEFAULT');
                    continue;
                }

                const pickable = this.choosing.filter(manager => manager.canChooseModule(card)).length;
                assert.ok(pickable <= 1);

                card.shape.setState(pickable === 1 ? 'DEFAULT' : 'DISABLED');
            }
        }

        for (const info of board.getHand()) {
            this.shapes.get(CardGetters.id(info.card))!.setState('DEFAULT');
        }
    }

    private fieldCards(chunk: ChunkId): FieldCard[] {
        const board = this.model();
        const owner = board.getChunk(chunk)!.owner;

        return board.getChunkModules(chunk).map(module => ({
            id: module.id,
            module,
            player: owner,
            shape: this.shapes.get(module.id)!
        }));
    }

    private fieldCard(id: CardId): FieldCard | undefined {
        const board = this.model();
        const info = board.getCard(id);

        if (info === undefined || info.location.type !== "chunk") {
            return undefined;
        }

        const module = CardGetters.asModule(info.card);

        if (module === undefined) {
            return undefined;
        }

        return {
            id,
            module,
            player: board.getChunk(info.location.chunk)!.owner,
            shape: this.shapes.get(id)!
        };
    }

    // ---------------------------------------------------------- chunk outline

    private drawOutline(chunk: ChunkId) {
        const board = this.model();
        const group = this.groups.get(chunk)!;

        const lines = getSpaceshipOutline(board.getChunkSpaceship(chunk), 0.05).map(path =>
            new Line({
                strokeWidth: 5,
                stroke: this.outlineColor.setAlpha(0).toString(),
                points: path.map(point => this.toPixels(point)),
                lineJoin: "round",
                closed: true
            })
        );

        group.add(...lines);
        this.outlines.set(chunk, lines);

        lines.forEach(line => line.animate({stroke: this.outlineColor.setAlpha(1).toString()}, 500));
    }

    private clearOutline(chunk: ChunkId) {
        this.outlines.get(chunk)?.forEach(line => line.destroy());
        this.outlines.delete(chunk);
    }

    // -------------------------------------------------------------- selection

    startChoosingModules(
        check: (info: { module: ModuleCard, player: PlayerId }) => boolean,
        count: CountBoundary,
        outlineColor: Color
    ) {
        assert.ok(!this.model().getCanRebuild());

        const manager = new ChooseModuleManager(check, count, outlineColor);
        this.choosing.push(manager);

        this.applyStates();

        return manager.getHandle();
    }

    endChoosingModules() {
        this.choosing.forEach(manager => manager.deactivate());
        this.choosing = [];

        this.applyStates();
    }

    // ----------------------------------------------------------------- gestures

    private handler() {
        return {
            isOnField: (id: CardId) => this.model().getCard(id)?.location.type === "chunk",
            onCardClick: (id: CardId) => this.onCardClick(id),
            onChunkSelect: (id: CardId) => this.onChunkSelect(id),
            onChunkDeselect: () => this.onChunkDeselect(),
            onDragStart: (id: CardId) => this.onDragStart(id),
            onDragMove: (id: CardId) => this.onDragMove(id),
            onDragEnd: (id: CardId) => this.onDragEnd(id)
        };
    }

    private onCardClick(id: CardId) {
        const board = this.model();

        if (board.isCardModifiable(id)) {
            board.rotateInPlace(id);

            this.layout();
            this.persist();
        }

        const info = board.getCard(id);

        if (info === undefined || info.location.type !== "chunk") {
            return;
        }

        // only modules on a real ship can be picked: a fragment is a hand card lying on the field
        if (!board.hasMainModule(info.location.chunk)) {
            return;
        }

        const card = this.fieldCard(id);

        if (card !== undefined) {
            this.choosing.find(manager => manager.canChooseModule(card))?.onClick(card);
        }
    }

    private onChunkSelect(id: CardId) {
        const info = this.model().getCard(id);

        if (info === undefined || info.location.type !== "chunk") {
            return;
        }

        this.selectedChunk = info.location.chunk;

        this.groups.get(this.selectedChunk)!.moveToTop();
        this.drawOutline(this.selectedChunk);
    }

    private onChunkDeselect() {
        if (this.selectedChunk !== undefined) {
            this.clearOutline(this.selectedChunk);
            this.selectedChunk = undefined;
        }
    }

    /**
     * Picking a card up.
     *
     * A card only tears loose on its own if the player may rebuild the chunk it is in. Otherwise the
     * gesture takes the whole chunk instead — which is how an opponent's ship, or your own outside
     * the rebuild phase, can still be dragged out of the way. Holding any card does the same, and so
     * does grabbing the command module, which anchors the ship and is therefore its handle.
     */
    private onDragStart(id: CardId) {
        const board = this.model();

        // we place the dragged thing ourselves, on the board's terms
        DD.getDragElement(this.shapes.get(id)!).followPointer = false;

        const info = board.getCard(id)!;

        if (info.location.type === "hand") {
            this.startHandDrag(id);
            return;
        }

        if (info.location.type !== "chunk") {
            return;
        }

        document.body.style.cursor = "grabbing";

        const grabsWholeChunk = this.selectedChunk !== undefined || !board.canDetachCard(id);

        let chunk: ChunkId;

        if (grabsWholeChunk) {
            chunk = info.location.chunk;

            if (this.selectedChunk === undefined) {
                this.onChunkSelect(id);
                this.events.get(id)!.markChunkSelected();
            }
        } else if (board.getChunkModules(info.location.chunk).length === 1) {
            chunk = info.location.chunk;
        } else {
            chunk = this.detachIntoOwnChunk(id);
        }

        this.dragState = {
            kind: "chunk",
            chunk,
            offset: this.offsetWithin(chunk),
            connections: []
        };

        this.sync();
    }

    /** Tears one card out of its chunk into a chunk of its own, without it appearing to move. */
    private detachIntoOwnChunk(id: CardId): ChunkId {
        const board = this.model();
        const info = board.getCard(id)!;

        assert.ok(info.location.type === "chunk");

        const from = board.getChunk(info.location.chunk)!;
        const module = CardGetters.asModule(info.card)!;

        const position = {x: from.position.x + module.x, y: from.position.y + module.y};

        board.liftCard(id);

        const chunk = board.createChunk(board.getThisPlayer(), position);
        board.addCardToChunk(id, chunk.id, {x: 0, y: 0});

        return chunk.id;
    }

    private offsetWithin(chunk: ChunkId): Vector2 {
        const pointer = this.pointerInModel();
        const position = this.model().getChunk(chunk)!.position;

        return {x: pointer.x - position.x, y: pointer.y - position.y};
    }

    private startHandDrag(id: CardId) {
        const board = this.model();
        const info = board.getCard(id)!;

        assert.ok(info.location.type === "hand");

        document.body.style.cursor = "grabbing";

        const shape = this.shapes.get(id)!;
        const index = info.location.index;
        const absolute = shape.getAbsolutePosition();

        this.dragState = {
            kind: "hand",
            card: id,
            offset: shape.getRelativePointerPosition()
        };

        board.removeFromHand(id);

        this.handManager.setCards(
            board.getHand().map(held => this.shapes.get(CardGetters.id(held.card))!)
        );
        this.handManager.setPlaceholder(index);

        // lifted out of the hand's layout, so it can follow the pointer across the board
        shape.moveTo(this.handScene);
        shape.setAbsolutePosition(absolute);
    }

    private onDragMove(id: CardId) {
        if (this.dragState === undefined) {
            return;
        }

        if (this.dragState.kind === "hand") {
            this.moveHandDrag(this.dragState);
        } else {
            this.moveChunkDrag(this.dragState);
        }
    }

    private moveHandDrag(drag: DragState & { kind: "hand" }) {
        const index = this.handManager.getDropIndex();

        if (index !== undefined) {
            this.handManager.setPlaceholder(index);
            this.followPointer(drag.card, drag.offset);
            return;
        }

        // dragged clear of the hand: it becomes a chunk of its own out on the field
        const board = this.model();

        this.handManager.setPlaceholder(undefined);

        const pointer = this.pointerInModel();
        const position = {
            x: pointer.x - drag.offset.x / this.cardSize,
            y: pointer.y - drag.offset.y / this.cardSize
        };

        const chunk = board.createChunk(board.getThisPlayer(), position);
        board.addCardToChunk(drag.card, chunk.id, {x: 0, y: 0});

        this.dragState = {
            kind: "chunk",
            chunk: chunk.id,
            offset: {x: drag.offset.x / this.cardSize, y: drag.offset.y / this.cardSize},
            connections: []
        };

        this.sync();
    }

    private moveChunkDrag(drag: DragState & { kind: "chunk" }) {
        const board = this.model();
        const pointer = this.pointerInModel();

        const wanted = {x: pointer.x - drag.offset.x, y: pointer.y - drag.offset.y};
        const chunk = board.getChunk(drag.chunk)!;

        if (drag.connections.length > 0) {
            // snapped: hold still until the player pulls far enough away to break it
            if (getDistance(wanted, chunk.position) < CONNECT_DISTANCE) {
                return;
            }

            drag.connections = [];

            // it is loose again, so it stops reading as part of the ship
            this.applyStates();
        }

        // A lone card carried back over the hand goes into it — but only a card the player may
        // actually take. A ship whittled down to its command module is still a ship, and an
        // opponent's chunk is not ours to pocket.
        const alone = board.getChunkModules(drag.chunk);

        if (alone.length === 1 && board.canDetachCard(alone[0].id)) {
            const index = this.handManager.getDropIndex();

            if (index !== undefined) {
                const card = alone[0].id;

                board.liftCard(card);

                this.dragState = {
                    kind: "hand",
                    card,
                    offset: {x: drag.offset.x * this.cardSize, y: drag.offset.y * this.cardSize}
                };

                // sync lifts the card out of the chunk group it just emptied, before destroying it
                this.sync();
                this.handManager.setPlaceholder(index);

                return;
            }
        }

        board.moveChunk(drag.chunk, wanted);

        const autorotate = board.findAutorotateTarget(drag.chunk);

        if (autorotate !== undefined) {
            const module = board.getChunkModules(drag.chunk)[0];

            if (module.rotation !== autorotate.rotation) {
                module.rotation = autorotate.rotation;
                this.shapes.get(module.id)!.rotateCard(autorotate.rotation * (Math.PI / 2), 100);
            }
        }

        const connections = board.findConnectionPoints(drag.chunk);

        if (connections.length > 0) {
            board.applySnap(drag.chunk, connections);
            drag.connections = connections;

            // it is on the ship now, even though the merge only happens on release — so it should
            // look like it, rather than staying dimmed until the player lets go
            this.applyStates();
        }

        this.layout();
    }

    private followPointer(id: CardId, offset: Vector2) {
        const absolute = this.spaceshipsScene.getGraphics().getPointerPosition();

        this.shapes.get(id)!.setAbsolutePosition({
            x: absolute.x - offset.x,
            y: absolute.y - offset.y
        });
    }

    private onDragEnd(id: CardId) {
        const drag = this.dragState;

        document.body.style.cursor = "default";

        if (drag === undefined) {
            return;
        }

        const board = this.model();

        if (drag.kind === "chunk") {
            this.onChunkDeselect();

            if (drag.connections.length > 0) {
                board.mergeChunks(drag.chunk, drag.connections);
            }
        } else {
            const index = this.handManager.getDropIndex() ?? board.getHand().length;

            board.insertIntoHand(drag.card, index);
            this.handManager.setPlaceholder(undefined);
        }

        this.dragState = undefined;
        this.selectedChunk = undefined;

        this.sync();

        // a state that arrived while the player was still holding a card
        if (this.pending !== undefined) {
            const {player, otherPlayers} = this.pending;
            this.pending = undefined;

            this.setData(player, otherPlayers);
        }
    }
}
