import {Card, ModuleCard, ModuleType, OtherPlayer, Player, PlayerId, Spaceship, Vector2} from "@common/Types";
import {ModuleGetters} from "@common/getters/Module";
import {getDistance} from "@common/helpers/Vector";
import {CardGetters} from "@common/getters/Card";
import {SpaceshipModifiers} from "@common/modifiers/Spaceship";
import {directions, opposites, SpaceshipGetters} from "@common/getters/Spaceship";

import SpaceshipsScene from "../scenes/Spaceships";
import {CardInfo, CardLocation} from "./CardInfo";
import {Chunk} from "./Chunk";
import {HandManager} from "./HandManager";
import Scene from "../engine/Scene";
import {CardShape} from "../shapes/CardShape";
import * as assert from "../../assert";
import {DD} from "../engine/Drag";
import {getSpaceshipOutline} from "./ShipOutline";
import {Line} from "../engine/shapes/Line";
import Color from "@common/helpers/Color";
import {Node} from "../engine/Node";
import {CountBoundary} from "../CountBoundary";
import {ChooseModuleManager} from "./ChooseModuleManager";
import {CardEvents} from "./CardEvents";

type ConnectionPoint = { chunk: Chunk, spaceship: Spaceship, offset: Vector2 };

function mergeSpaceships(...parts: { spaceship: Spaceship, offset: Vector2 }[]): Spaceship {
    const result: ModuleCard[] = [];

    for (const part of parts) {
        for (const module of part.spaceship.modules) {
            const copy = structuredClone(module);
            copy.x += part.offset.x;
            copy.y += part.offset.y;

            result.push(copy);
        }
    }

    return {modules: result};
}

type DragState = {
    type: "chunk",
    offset: Vector2,
    chunk: Chunk,
    connectionPoints: ConnectionPoint[]
} | {
    type: "hand",
    offset: Vector2,
};

type PersistentState = {
    cards: {
        id: number,
        location: { type: "hand", index: number } | { type: "chunk", chunk: number, position: Vector2 },
        rotation: number
    }[],
    chunks: {
        position: Vector2,
        owner: PlayerId
    }[]
};

export class CardsManager {
    private readonly cardSize: number;

    private readonly spaceshipsConfiguration: Vector2[] = [
        {x: 0, y: 0}, {x: 0, y: -500}, {x: 500, y: 0}, {x: -500, y: 0}, {x: 0, y: 500}
    ];

    private readonly autorotateDistance = 0.5;
    private readonly connectDistance = 0.25;
    private readonly closeConnectDistance = 0.1;
    private readonly selectChunkDuration = 500;
    private readonly outlineColor = Color.fromHex("#ffb703");

    private readonly gameId: string;

    private spaceshipsScene: SpaceshipsScene;
    private handScene: Scene;

    private cards: CardInfo[] = [];
    private chunks: Chunk[] = [];

    private canRebuildSpaceshipFlag: boolean = false;
    private thisPlayer: PlayerId;

    private handManager: HandManager;
    private activeChooseModule: ChooseModuleManager[] = [];

    private dragState: DragState | undefined = undefined;
    private selectedChunk: Chunk | undefined = undefined;

    private isFirstSetData = true;

    constructor(gameId: string, spaceshipsScene: SpaceshipsScene, handScene: Scene) {
        this.gameId = gameId;

        this.spaceshipsScene = spaceshipsScene;
        this.handScene = handScene;

        this.cardSize = Math.max(this.spaceshipsScene.width() / 10, 75);

        this.handManager = new HandManager(this.handScene, this.cardSize);

        window["cardsManager"] = this;
    }

    private getChunkModules(chunk: Chunk): ModuleCard[] {
        return this.cards
            .filter(c => c.location.type === "chunk" && c.location.chunk === chunk)
            .map(c => CardGetters.asModule(c.card)!);
    }

    private hasMainModule(chunk: Chunk): boolean {
        return this.getChunkModules(chunk).some(m => m.type === ModuleType.MainModule);
    }

    private getChunkSpaceship(chunk: Chunk): Spaceship {
        return {
            modules: this.getChunkModules(chunk),
            activatedProtector: chunk.activatedProtector
        };
    }

    private isCardModifiable(info: CardInfo): boolean {
        return info.location.type !== "chunk" || this.isChunkModifiable(info.location.chunk);
    }

    private isChunkModifiable(chunk: Chunk): boolean {
        return chunk.owner === this.thisPlayer && (this.canRebuildSpaceshipFlag || !this.hasMainModule(chunk));
    }

    private getModifiableChunks(): Chunk[] {
        return this.chunks.filter(c =>
            this.isChunkModifiable(c)
            && !(this.dragState.type === "chunk" && this.dragState.chunk === c)
        );
    }

    setData(thisPlayer: Player, otherPlayers: OtherPlayer[]) {
        this.thisPlayer = thisPlayer.id;

        if (this.isFirstSetData) {
            this.isFirstSetData = false;

            const cards = [
                ...thisPlayer.hand,
                ...thisPlayer.spaceship.modules.map(ModuleGetters.asCard),
                ...otherPlayers.flatMap(p => p.spaceship.modules).map(ModuleGetters.asCard)
            ];

            const isSuccessful = this.tryRestoreState(cards);
            assert.ok(isSuccessful);
        }

        // New data must be reconciled with old data. Strategy is the following:
        // go through every card in new data and update current state according to new card state
        // all cards that aren't present in new state must be destroyed. visitedCards keeps track of cards that
        // are present in new data.
        const visitedCards: number[] = [];

        // if there is currently dragged card, ensure that it is still in this player's possession
        const thisPlayersCards = [
            ...thisPlayer.hand,
            ...thisPlayer.spaceship.modules.map(ModuleGetters.asCard)
        ].map(CardGetters.id);

        const dragCard = this.cards.find(c => c.location.type === "drag");
        if (dragCard && !thisPlayersCards.includes(CardGetters.id(dragCard.card))) {
            this.cards = this.cards.filter(c => c !== dragCard);
            dragCard.shape.destroy();
        }

        // now in spaceships of other players every card can be only in "chunk" or "hand" state

        for (const player of otherPlayers) {
            const chunk = this.getOrCreateChunk(player.id, this.allocateSpaceshipPosition());
            chunk.activatedProtector = structuredClone(player.spaceship.activatedProtector);

            for (const module of player.spaceship.modules) {
                visitedCards.push(module.id);

                const info = this.cards.find(c => CardGetters.id(c.card) === module.id);

                if (!info) {
                    this.createCard(ModuleGetters.asCard(module), {type: "chunk", chunk});
                } else {
                    if (info.location.type === "chunk") {
                        // do nothing
                    } else {
                        this.handManager.removeCard(info);
                    }

                    info.card = ModuleGetters.asCard(module);
                    this.addCardToChunk(info, chunk);
                }
            }
        }

        for (const card of thisPlayer.hand) {
            visitedCards.push(CardGetters.id(card));

            const info = this.cards.find(c => CardGetters.id(c.card) === CardGetters.id(card));

            if (!info) {
                this.createCard(card, {type: "hand"});
            } else {
                if (card.cardType === "module") {
                    card.module.rotation = info.card.cardType === "module" ? info.card.module.rotation : 0;
                }

                info.card = card;

                if (info.location.type === "chunk" && !this.isChunkModifiable(info.location.chunk)) {
                    info.location = {type: "hand"}

                    info.shape.remove();
                    this.handManager.addCardToScene(info);
                    this.handManager.pushCardToHand(info);
                }
            }
        }

        const chunk = this.getOrCreateChunk(this.thisPlayer, this.allocateSpaceshipPosition());
        chunk.activatedProtector = structuredClone(thisPlayer.spaceship.activatedProtector);

        for (const module of thisPlayer.spaceship.modules) {
            visitedCards.push(module.id);

            const info = this.cards.find(c => CardGetters.id(c.card) === module.id);

            if (!info) {
                this.createCard(ModuleGetters.asCard(module), {type: "chunk", chunk});
            } else {

            }
        }

        // remove unvisited cards
        for (const info of this.cards) {
            if (visitedCards.includes(CardGetters.id(info.card))) {
                continue;
            }

            if (info.location.type === "hand") {
                this.handManager.removeCard(info);
            } else if (info.location.type === "chunk") {
                this.removeCardFromChunk(info);
            }

            info.shape.destroy();
            this.cards = this.cards.filter(c => c !== info);
        }

        // update chunks
        const chunks = Array.from(this.chunks);
        for (const chunk of chunks) {
            this.updateChunkConnectedness(chunk);
        }

        for (const chunk of this.chunks) {
            this.updateModulesDisabledState(this.getChunkModules(chunk));
        }

        this.storeState();
    }

    canRebuildSpaceship(value: boolean) {
        this.canRebuildSpaceshipFlag = value;
    }

    getMainChunk(player: PlayerId): Chunk | undefined {
        for (const info of this.cards) {
            if (info.card.cardType === "module" && info.card.module.type === ModuleType.MainModule) {
                assert.ok(info.location.type === "chunk");

                if (info.location.chunk.owner === player) {
                    return info.location.chunk;
                }
            }
        }

        return undefined;
    }

    getSpaceship(): Spaceship | undefined {
        return this.getChunkSpaceship(this.getMainChunk(this.thisPlayer));
    }

    startChoosingModules(check: (info: {
        module: ModuleCard,
        player: PlayerId
    }) => boolean, count: CountBoundary, outlineColor: Color) {
        assert.ok(!this.canRebuildSpaceshipFlag);

        const manager = new ChooseModuleManager(check, count, outlineColor);
        this.activeChooseModule.push(manager);

        this.updateChooseModule();

        return manager.getHandle();
    }

    endChoosingModules() {
        this.activeChooseModule.forEach(manager => manager.deactivate());
        this.activeChooseModule = [];

        this.updateChooseModule();
    }

    private updateChooseModule() {
        for (const chunk of this.chunks) {
            if (!this.hasMainModule(chunk)) {
                continue;
            }

            for (const module of this.getChunkModules(chunk)) {
                const info = this.cards.find(c => CardGetters.id(c.card) === module.id)!;

                const active = this.activeChooseModule
                    .filter(manager => manager.canChooseModule(info))
                    .length;

                assert.ok(active <= 1);

                info.shape.setState(active === 1 ? "DEFAULT" : "DISABLED");
            }
        }
    }

    private attachCardEvents(info: CardInfo) {
        if (info.card.cardType === "module") {
            const cardEvents = new CardEvents(info);
            cardEvents.attachEvents(this);
        }
    }

    private isDragAllowed(card: CardInfo) {
        return this.selectedChunk !== undefined || this.isCardModifiable(card);
    }

    onCardClick(info: CardInfo) {
        if (this.isCardModifiable(info)) {
            this.rotateInPlace(info);
        }

        if (info.location.type === "chunk" && this.hasMainModule(info.location.chunk)) {
            const chooseManager = this.activeChooseModule
                .find(manager => manager.canChooseModule(info));

            if (chooseManager !== undefined) {
                chooseManager.onClick(info);
            }
        }

        this.storeState();
    }

    onChunkSelect(chunk: Chunk) {
        this.selectedChunk = chunk;

        chunk.group.moveToTop();

        chunk.outline = getSpaceshipOutline(this.getChunkSpaceship(chunk), 0.05).map(path =>
            new Line({
                strokeWidth: 5,
                stroke: this.outlineColor.setAlpha(0).toString(),
                points: path.map(p => ({x: p.x * this.cardSize, y: p.y * this.cardSize})),
                lineJoin: "round",
                closed: true
            })
        );

        chunk.group.add(...chunk.outline);
        chunk.outline.forEach(l =>
            l.animate({
                stroke: this.outlineColor.setAlpha(1).toString()
            }, 500)
        );
    }

    onChunkDeselect(chunk: Chunk) {
        chunk.outline.forEach(l => l.destroy());
        chunk.outline = [];

        this.selectedChunk = undefined;
    }

    onDragStart(info: CardInfo) {
        DD.getDragElement(info.shape).followPointer = false;

        if (!this.isDragAllowed(info)) {
            return;
        }

        document.body.style.cursor = "grabbing";

        if (info.location.type === "chunk") {
            assert.ok(info.card.cardType === "module");

            let dragChunk: Chunk;

            if (this.selectedChunk !== undefined) {
                dragChunk = this.selectedChunk;
            } else {
                if (this.getChunkModules(info.location.chunk).length === 1) {
                    dragChunk = info.location.chunk;
                } else {
                    const newChunk = this.createEmptyChunk(
                        this.thisPlayer,
                        info.location.chunk.group.getPosition()
                    );

                    this.removeCardFromChunk(info);
                    this.addCardToChunk(info, newChunk);

                    dragChunk = newChunk;
                }
            }

            this.dragState = {
                type: "chunk",
                offset: dragChunk.group.getRelativePointerPosition(),
                chunk: dragChunk,
                connectionPoints: []
            };
        } else if (info.location.type === "hand") {
            info.location = {type: "drag"};

            const position = info.shape.getAbsolutePosition();

            this.handManager.replaceCardWithPlaceholder(info);

            info.shape.moveTo(this.handScene);
            info.shape.setPosition(position);

            this.dragState = {
                type: "hand",
                offset: info.shape.getRelativePointerPosition()
            };
        }
    }

    onDragMove(info: CardInfo) {
        if (!this.isDragAllowed(info)) {
            return;
        }

        assert.ok(info.card.cardType === "module");

        const absoluteDragPosition = this.getDragPosition(info);

        if (this.dragState.type === "chunk") {
            const dragChunk = this.dragState.chunk;
            const dragPosition = this.spaceshipsScene.getTransform().invert().point(absoluteDragPosition);

            if (this.dragState.connectionPoints.length !== 0) {
                // try to disconnect from chunks if distance is too big
                const actualPosition = dragChunk.group.getPosition();

                if (getDistance(dragPosition, actualPosition) >= this.connectDistance) {
                    for (const cp of this.dragState.connectionPoints) {
                        this.updateModulesDisabledState(this.getChunkModules(cp.chunk));
                    }

                    this.updateModulesDisabledState(this.getChunkModules(dragChunk));

                    this.dragState.connectionPoints = [];
                }
            }

            // try push to hand
            if (this.getChunkModules(dragChunk).length === 1) {
                const placeholderPosition = this.handManager.getPlaceholderPosition();

                if (placeholderPosition !== undefined) {
                    info.location = {type: "hand"};
                    this.dragState = {
                        type: "hand",
                        offset: {
                            x: this.dragState.offset.x - info.card.module.x * this.cardSize,
                            y: this.dragState.offset.y - info.card.module.y * this.cardSize
                        },
                    };

                    info.shape.moveTo(this.handScene);
                    info.shape.setAbsolutePosition(absoluteDragPosition);

                    this.destroyChunk(dragChunk);
                    this.handManager.addPlaceholder(placeholderPosition);

                    return;
                }
            }

            if (this.dragState.connectionPoints.length === 0) {
                // follow pointer
                dragChunk.group.setPosition(dragPosition);

                if (!this.isChunkModifiable(dragChunk)) {
                    return;
                }

                // autorotate
                if (this.getChunkModules(dragChunk).length === 1) {
                    const autorotatePoint = this.getModifiableChunks()
                        .map(c => {
                            const p = this.getClosestModulePosition(c, info.shape.getAbsolutePosition());
                            const rotation = this.getFeasibleModuleRotation(
                                this.getChunkSpaceship(c),
                                CardGetters.asModule(info.card)!,
                                p.position
                            );

                            return {
                                distance: p.distance,
                                rotation,
                                position: p.position
                            };
                        })
                        .filter(p => p.distance < this.autorotateDistance && p.rotation !== undefined)[0];

                    if (autorotatePoint) {
                        CardGetters.asModule(info.card)!.rotation = autorotatePoint.rotation;
                        info.shape.rotateCard(autorotatePoint.rotation * Math.PI / 2, 100);
                    }
                }

                // try to connect to chunks
                const connectionPoints = this.getConnectionPoints(dragChunk);

                if (connectionPoints.length >= 1) {
                    // update positions
                    dragChunk.group.setPosition({
                        x: connectionPoints[0].chunk.group.x() - connectionPoints[0].offset.x * this.cardSize,
                        y: connectionPoints[0].chunk.group.y() - connectionPoints[0].offset.y * this.cardSize
                    });

                    for (let i = 1; i < connectionPoints.length; ++i) {
                        connectionPoints[i].chunk.group.setPosition({
                            x: connectionPoints[0].chunk.group.x() + (connectionPoints[i].offset.x - connectionPoints[0].offset.x) * this.cardSize,
                            y: connectionPoints[0].chunk.group.y() + (connectionPoints[i].offset.y - connectionPoints[0].offset.y) * this.cardSize
                        });
                    }

                    this.updateModulesDisabledState([
                        ...this.getChunkModules(dragChunk),
                        ...connectionPoints.flatMap(p => this.getChunkModules(p.chunk))
                    ]);

                    this.dragState.connectionPoints = connectionPoints;
                }
            }
        } else {
            // measure distance to hand, if the card is too far
            // remove placeholder from hand
            const index = this.handManager.getPlaceholderPosition();

            if (index !== undefined) {
                this.handManager.setPlaceholderPosition(index);
                info.shape.setAbsolutePosition(this.getDragPosition(info));
            } else {
                this.handManager.removePlaceholder();

                const newChunk = this.createEmptyChunk(
                    this.thisPlayer,
                    this.spaceshipsScene.getTransform().invert().point(this.getDragPosition(info))
                );

                this.addCardToChunk(info, newChunk, {x: 0, y: 0});
                this.updateModulesDisabledState([info.card.module]);

                this.dragState = {
                    type: "chunk",
                    offset: this.dragState.offset,
                    chunk: newChunk,
                    connectionPoints: []
                };
            }
        }
    }

    onDragEnd(info: CardInfo) {
        if (!this.isDragAllowed(info)) {
            return;
        }

        document.body.style.cursor = "default";

        if (this.dragState.type === "chunk") {
            const dragChunk = this.dragState.chunk;

            this.onChunkDeselect(dragChunk);

            if (this.dragState.connectionPoints.length > 0) {
                this.mergeChunks(dragChunk, this.dragState.connectionPoints);
            }
        } else {
            console.log("here");
            this.handManager.replacePlaceholderWithCard(info);
            info.location = {type: "hand"};
        }

        this.selectedChunk = undefined;
        this.dragState = undefined;

        this.storeState();
    }

    // returns dragged shape absolute position
    private getDragPosition(info: CardInfo): Vector2 {
        assert.ok(this.dragState !== undefined);

        const draggedShape: Node = this.dragState.type === "chunk"
            ? this.dragState.chunk.group
            : info.shape;

        const absolutePointerPosition = this.spaceshipsScene.getGraphics().getPointerPosition();
        const absoluteOffset = draggedShape.getAbsoluteTransform().vector(this.dragState.offset);

        return {
            x: absolutePointerPosition.x - absoluteOffset.x,
            y: absolutePointerPosition.y - absoluteOffset.y
        };
    }

    private removeCardFromChunk(info: CardInfo) {
        assert.ok(info.location.type === "chunk");

        const chunk = info.location.chunk;

        info.location = {type: "drag"};

        this.updateChunkConnectedness(chunk);
    }

    private updateChunkConnectedness(chunk: Chunk) {
        const spaceship = this.getChunkSpaceship(chunk);

        if (spaceship.modules.length === 0) {
            this.destroyChunk(chunk);
        } else {
            const components = SpaceshipGetters.getComponents(spaceship);

            for (let i = 0; i < components.length; ++i) {
                const componentChunk = i === 0
                    ? chunk
                    : this.createEmptyChunk(this.thisPlayer, chunk.group.getPosition());

                for (const module of components[i].modules) {
                    const info = this.cards.find(c => CardGetters.id(c.card) === module.id)!;

                    info.location = {type: "chunk", chunk: componentChunk};
                    info.shape.moveTo(componentChunk.group);
                }

                this.updateModulesDisabledState(components[i].modules);
            }
        }
    }

    private getConnectionPoints(chunk: Chunk): ConnectionPoint[] {
        let primaryConnectionPoint: ConnectionPoint | undefined = undefined;

        const spaceship = this.getChunkSpaceship(chunk);

        for (const otherChunk of this.getModifiableChunks()) {
            if (otherChunk === chunk) {
                continue;
            }

            for (const module of spaceship.modules) {
                const modulePosition = this.cards.find(c => CardGetters.id(c.card) === module.id)!.shape.getAbsolutePosition()

                const closestModuleInfo = this.getClosestModulePosition(otherChunk, modulePosition);

                if (closestModuleInfo.distance < this.connectDistance) {
                    const newConnectionPoint = {
                        chunk: otherChunk,
                        offset: {
                            x: module.x - closestModuleInfo.position.x,
                            y: module.y - closestModuleInfo.position.y
                        },
                        spaceship: this.getChunkSpaceship(otherChunk)
                    };

                    const mergedSpaceship = mergeSpaceships(
                        {spaceship, offset: {x: 0, y: 0}}, newConnectionPoint
                    );

                    if (SpaceshipGetters.checkConfiguration(mergedSpaceship, false)) {
                        primaryConnectionPoint = newConnectionPoint;
                        break;
                    }
                }
            }

            if (primaryConnectionPoint !== undefined) {
                break;
            }
        }


        if (primaryConnectionPoint === undefined) {
            return [];
        }

        const connectionPoints: ConnectionPoint[] = [primaryConnectionPoint];

        for (const otherChunk of this.getModifiableChunks()) {
            if (otherChunk === primaryConnectionPoint.chunk || otherChunk === chunk) {
                continue;
            }

            for (const module of spaceship.modules) {
                const modulePosition = primaryConnectionPoint.chunk.group.getAbsoluteTransform().point({
                    x: (module.x - primaryConnectionPoint.offset.x) * this.cardSize,
                    y: (module.y - primaryConnectionPoint.offset.y) * this.cardSize,
                });

                const closestModuleInfo = this.getClosestModulePosition(otherChunk, modulePosition);

                if (closestModuleInfo.distance < this.closeConnectDistance) {
                    const newConnectionPoint = {
                        chunk: otherChunk,
                        offset: {
                            x: module.x - closestModuleInfo.position.x,
                            y: module.y - closestModuleInfo.position.y
                        },
                        spaceship: this.getChunkSpaceship(otherChunk)
                    };

                    const mergedSpaceship = mergeSpaceships(
                        {spaceship, offset: {x: 0, y: 0}}, ...connectionPoints, newConnectionPoint
                    );

                    if (this.hasBadConnection(mergedSpaceship)) {
                        return [];
                    }

                    if (SpaceshipGetters.checkConfiguration(mergedSpaceship, false)) {
                        connectionPoints.push(newConnectionPoint);
                        break;
                    }
                }
            }
        }

        return connectionPoints;
    }

    private hasBadConnection(ship: Spaceship) {
        for (const module of ship.modules) {
            for (const [key, value] of Object.entries(directions)) {
                const module_in_direction = SpaceshipGetters.getModuleByPosition(ship, module.x + value.x, module.y + value.y);

                if (!module_in_direction) {
                    continue;
                }

                if (SpaceshipGetters.getConnectorInDirection(module, key) !== SpaceshipGetters.getConnectorInDirection(module_in_direction, opposites[key])) {
                    return true;
                }
            }
        }

        return false;
    }

    private destroyChunk(chunk: Chunk) {
        assert.ok(this.getChunkModules(chunk).length === 0);

        chunk.group.destroy();
        this.chunks = this.chunks.filter(c => c !== chunk);
    }

    private mergeChunks(primaryChunk: Chunk, connectionPoints: ConnectionPoint[]) {
        if (connectionPoints.length === 0) {
            return;
        }

        const mergedSpaceship = mergeSpaceships(
            {spaceship: this.getChunkSpaceship(primaryChunk), offset: {x: 0, y: 0}},
            ...connectionPoints
        );

        for (const module of mergedSpaceship.modules) {
            const info = this.cards.find(c => CardGetters.id(c.card) === module.id)!;
            this.addCardToChunk(info, primaryChunk, ModuleGetters.position(module));
        }

        for (const connectionPoint of connectionPoints) {
            this.destroyChunk(connectionPoint.chunk);
        }

        this.updateModulesDisabledState(this.getChunkModules(primaryChunk));
    }

    private addCardToChunk(info: CardInfo, chunk: Chunk, position?: Vector2) {
        assert.ok(info.card.cardType === "module");

        if (position === undefined) {
            position = ModuleGetters.position(info.card.module);
        }

        info.shape.moveTo(chunk.group);
        info.shape.setPosition({
            x: position.x * this.cardSize,
            y: position.y * this.cardSize
        });

        info.card.module.x = position.x;
        info.card.module.y = position.y;

        info.location = {type: "chunk", chunk: chunk};
    }

    private getClosestModulePosition(chunk: Chunk, position: Vector2) {
        const relativePosition = chunk.group.getAbsoluteTransform().invert().point(position);
        relativePosition.x /= this.cardSize;
        relativePosition.y /= this.cardSize;

        const closestModulePosition = {
            x: Math.round(relativePosition.x),
            y: Math.round(relativePosition.y)
        };

        const distance = getDistance(relativePosition, closestModulePosition);

        return {
            position: closestModulePosition,
            distance
        };
    }

    // returns rotation if module can be connected and undefined otherwise
    private getFeasibleModuleRotation(spaceship: Spaceship, module: ModuleCard, position: Vector2): number | undefined {
        let canConnect = SpaceshipGetters.canConnectModule(spaceship, module, position.x, position.y);

        if (canConnect) {
            return module.rotation;
        }

        const possibleRotations = SpaceshipGetters.getPossibleRotationsFor(
            spaceship, module, position.x, position.y
        );

        return possibleRotations[0];
    }

    getPlayerSpaceshipPosition(id: PlayerId): Vector2 | undefined {
        for (const info of this.cards) {
            if (info.card.cardType === "module" && info.card.module.type === ModuleType.MainModule) {
                assert.ok(info.location.type === "chunk");

                if (info.location.chunk.owner === id) {
                    const chunkPosition = info.location.chunk.group.getPosition();

                    return {
                        x: chunkPosition.x + info.card.module.x + this.cardSize / 2,
                        y: chunkPosition.y + info.card.module.y + this.cardSize / 2,
                    };
                }
            }
        }

        return undefined;
    }

    private rotateInPlace(info: CardInfo) {
        const module = CardGetters.asModule(info.card)!;
        const initRotation = module.rotation;

        if (info.location.type === "chunk") {
            const spaceship = this.getChunkSpaceship(info.location.chunk);
            SpaceshipModifiers.removeModule(spaceship, module);

            const possibleRotations = SpaceshipGetters.getPossibleRotationsFor(spaceship, module, module.x, module.y);

            let index = possibleRotations.indexOf(initRotation);
            index = (index + 1) % possibleRotations.length;

            module.rotation = possibleRotations[index];
            info.shape.rotateCard(module.rotation * (Math.PI / 2), 100);

            SpaceshipModifiers.addModule(spaceship, module, module.x, module.y);
        } else if (info.location.type === "hand") {
            module.rotation = (module.rotation + 1) % 4;
            info.shape.rotateCard(module.rotation * (Math.PI / 2), 100);
        }
    }

    private allocateSpaceshipPosition(): Vector2 {
        const currentPlayersCount = new Set(this.chunks.map(c => c.owner)).size;
        return this.spaceshipsConfiguration[currentPlayersCount];
    }

    private updateModulesDisabledState(modules: ModuleCard[]) {
        const isMainChunk = modules.some(m => m.type === ModuleType.MainModule);

        for (const module of modules) {
            const info = this.cards.find(c => CardGetters.id(c.card) === module.id)!;
            info.shape.setState(isMainChunk ? 'DEFAULT' : 'DISABLED');
        }
    }

    resize() {
        this.handManager.resize();
    }

    private getOrCreateChunk(owner: PlayerId, position: Vector2): Chunk {
        return this.chunks.find(c => c.owner === owner) ?? this.createEmptyChunk(owner, position);
    }

    private createEmptyChunk(owner: PlayerId, position: Vector2): Chunk {
        const chunk = {
            owner: owner,
            group: this.spaceshipsScene.createAndAdd.group(position),
            outline: [],
            activatedProtector: undefined
        };

        this.chunks.push(chunk);

        return chunk;
    }

    private createCard(card: Card, location: CardLocation): CardInfo {
        const shape = new CardShape({
            card: card,
            size: this.cardSize,
            originY: 0,
            originX: 0,
        });

        const info = {card, shape, location};

        if (location.type === "chunk") {
            assert.ok(card.cardType === "module");

            location.chunk.group.add(shape);
            shape.setPosition({
                x: card.module.x * this.cardSize,
                y: card.module.y * this.cardSize
            });
        } else if (location.type === "hand") {
            this.handManager.addCardToScene(info);
            this.handManager.pushCardToHand(info);
        }

        this.cards.push(info);
        this.attachCardEvents(info);

        return info;
    }

    private storeState() {
        const state: PersistentState = {
            cards: this.cards.map(info => {
                if (info.card.cardType === "event") {
                    assert.ok(info.location.type === "hand");

                    return {
                        id: info.card.event.id,
                        location: {type: "hand", index: this.handManager.getCardIndex(info)},
                        rotation: 0
                    };
                } else {
                    const module = info.card.module;

                    assert.ok(info.location.type === "hand" || info.location.type === "chunk");

                    let location: PersistentState["cards"][0]["location"];
                    if (info.location.type === "chunk") {
                        const chunk = info.location.chunk;

                        location = {
                            type: "chunk",
                            chunk: this.chunks.findIndex(c => c === chunk),
                            position: ModuleGetters.position(module)
                        };
                    } else {
                        location = {
                            type: "hand",
                            index: this.handManager.getCardIndex(info)!
                        };
                    }

                    return {
                        id: module.id,
                        rotation: module.rotation,
                        location
                    };
                }
            }),
            chunks: this.chunks.map((chunk, index) => ({
                position: chunk.group.getPosition(),
                owner: chunk.owner
            }))
        };

        localStorage.setItem(this.getStorageKey(), JSON.stringify(state));
    }

    private tryRestoreState(cards: Card[]): boolean {
        assert.ok(this.chunks.length === 0 && this.cards.length === 0);

        const stateString = localStorage.getItem(this.getStorageKey());

        if (!stateString) {
            return true;
        }

        const state = JSON.parse(stateString) as PersistentState;
        console.log(state);

        for (const chunk of state.chunks) {
            this.createEmptyChunk(chunk.owner, chunk.position);
        }

        for (const info of state.cards) {
            const card = cards.find(c => CardGetters.id(c) === info.id);

            if (!card) {
                continue;
            }

            if (card.cardType === "module") {
                card.module.rotation = info.rotation;
            }

            if (info.location.type === "chunk") {
                if (this.chunks.length <= info.location.chunk || card.cardType !== "module") {
                    return false;
                }

                card.module.x = info.location.position.x;
                card.module.y = info.location.position.y;

                this.createCard(card, {type: "chunk", chunk: this.chunks[info.location.chunk]});
            } else {
                this.createCard(card, {type: "hand"});
            }
        }

        return true;
    }

    private getStorageKey() {
        return `spaceships//cardsManager/${this.gameId}`;
    }
}