import {Card, ModuleCard, ModuleType, OtherPlayer, Player, PlayerId, Spaceship, Vector2} from "@common/Types";
import {ModuleGetters} from "@common/getters/Module";
import {getDistance} from "@common/VectorUtils";
import {CardGetters} from "@common/getters/Card";
import {SpaceshipModifiers} from "@common/modifiers/Spaceship";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import SpaceshipsScene from "../scenes/Spaceships";
import {CardInfo} from "./CardInfo";
import {Chunk} from "./Chunk";
import {HandManager} from "./HandManager";
import Scene from "../engine/Scene";
import {CardShape} from "../shapes/CardShape";
import * as assert from "../../assert";
import {DD} from "../engine/Drag";
import {getSpaceshipOutline} from "./ShipOutline";
import {Line} from "../engine/shapes/Line";
import Color from "../Color";
import {Node} from "../engine/Node";

type ConnectionPoint = { chunk: Chunk, spaceship: Spaceship, offset: Vector2 };

function asModule(card: Card): ModuleCard {
    assert.ok(card.cardType === "module");

    return card.module;
}

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

function addPointerHoldEvent(node: Node, duration: number) {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined = undefined;

    node.on('pointerdown', (evt) => {
        timeoutHandle = setTimeout(() => {
            node.fire('pointerhold', evt);
        }, duration);
    });

    node.on('pointerup pointerleave dragstart dragend', () => {
        clearTimeout(timeoutHandle);
    });
}

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

    private spaceshipsScene: SpaceshipsScene;
    private handScene: Scene;

    private cards: CardInfo[] = [];
    private chunks: Chunk[] = [];

    private canRebuildSpaceshipFlag: boolean = false;
    private thisPlayer: PlayerId;

    private handManager: HandManager;

    constructor(spaceshipsScene: SpaceshipsScene, handScene: Scene) {
        this.spaceshipsScene = spaceshipsScene;
        this.handScene = handScene;

        this.cardSize = Math.max(this.spaceshipsScene.width() / 10, 75);

        this.handManager = new HandManager(this.handScene, this.cardSize);

        window["cardsManager"] = this;
    }

    private getChunkModules(chunk: Chunk): ModuleCard[] {
        return this.cards
            .filter(c => c.location.type === "chunk" && c.location.chunk === chunk)
            .map(c => asModule(c.card));
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

    setData(thisPlayer: Player, otherPlayers: OtherPlayer[]) {
        this.thisPlayer = thisPlayer.id;

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

        const dragHandCard = this.cards.find(c => c.location.type === "dragHand");
        if (dragHandCard && !thisPlayersCards.includes(CardGetters.id(dragHandCard.card))) {
            this.cards = this.cards.filter(c => c !== dragHandCard);
            this.handManager.removePlaceholder();
            dragHandCard.shape.destroy();
        }

        // now in spaceships of other players every card can be only in "chunk" or "hand" state

        for (const player of otherPlayers) {
            let chunk = this.chunks.find(c => c.owner === player.id);

            if (!chunk) {
                chunk = {
                    owner: player.id,
                    group: this.spaceshipsScene.createAndAdd.group(this.allocateSpaceshipPosition()),
                    outline: [],
                    activatedProtector: undefined
                };

                this.chunks.push(chunk);
            }

            chunk.activatedProtector = structuredClone(player.spaceship.activatedProtector);

            for (const module of player.spaceship.modules) {
                let info = this.cards.find(c => CardGetters.id(c.card) === module.id);

                if (!info) {
                    const shape = new CardShape({
                        card: ModuleGetters.asCard(module),
                        size: this.cardSize,
                        originY: 0,
                        originX: 0,

                        x: module.x * this.cardSize,
                        y: module.y * this.cardSize
                    });

                    chunk.group.add(shape);

                    info = {
                        card: ModuleGetters.asCard(module),
                        shape: shape,
                        location: {type: "chunk", chunk}
                    };

                    this.cards.push(info);
                    this.attachCardEvents(info);
                } else if (info.location.type === "chunk") {
                    info.shape.remove();

                    chunk.group.add(info.shape);

                    info.location.chunk = chunk;
                    info = {
                        card: ModuleGetters.asCard(module),
                        shape: info.shape,
                        location: {type: "chunk", chunk}
                    };

                    this.attachCardEvents(info);
                }
            }
        }

        for (const card of thisPlayer.hand) {
            let info = this.cards.find(c => CardGetters.id(c.card) === CardGetters.id(card));

            if (!info) {
                const shape = new CardShape({
                    card: card,
                    size: this.cardSize,
                    originY: 0,
                    originX: 0,
                });

                info = {
                    card: card,
                    shape: shape,
                    location: {type: "hand"}
                };

                this.handManager.addCardToScene(info);
                this.handManager.pushCardToHand(info);

                this.cards.push(info);
                this.attachCardEvents(info);
            } else {
                // TODO
            }
        }

        let chunk = this.chunks.find(c => c.owner === this.thisPlayer);

        if (!chunk) {
            chunk = {
                owner: thisPlayer.id,
                activatedProtector: undefined,
                group: this.spaceshipsScene.createAndAdd.group(this.allocateSpaceshipPosition()),
                outline: []
            };

            this.chunks.push(chunk);
        } else {
            chunk.activatedProtector = structuredClone(thisPlayer.spaceship.activatedProtector);
        }

        for (const module of thisPlayer.spaceship.modules) {
            let info = this.cards.find(c => CardGetters.id(c.card) === module.id);

            if (!info) {
                const shape = new CardShape({
                    card: ModuleGetters.asCard(module),
                    size: this.cardSize,
                    originY: 0,
                    originX: 0,

                    x: module.x * this.cardSize,
                    y: module.y * this.cardSize
                });

                chunk.group.add(shape);

                info = {
                    card: ModuleGetters.asCard(module),
                    shape: shape,
                    location: {type: "chunk", chunk}
                };

                this.cards.push(info);
                this.attachCardEvents(info);
            } else {
                // TODO
            }
        }
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

    private attachCardEvents(info: CardInfo) {
        if (info.card.cardType === "event") {
            return;
        }

        this.attachModuleEvents(info);
    }

    private attachModuleEvents(info: CardInfo) {
        info.shape.draggable(true).dragDistance(5);

        const module = asModule(info.card);
        let dragOffset: Vector2;

        // when card shape is moved between scenes, dragend even is fired
        // it must be ignored
        let ignoreDragend = false;

        let dragChunk = false;

        // When a module or chunk is dragged and connected to other chunks,
        // they are not merged immediately. Instead, they are stored in this array.
        // The actual merge happens on dragend.
        let currentConnectionPoints: ConnectionPoint[] = [];

        addPointerHoldEvent(info.shape, this.selectChunkDuration);

        info.shape.on('click', () => {
            this.rotateInPlace(info);
        });

        info.shape.on('pointerhold', (evt) => {
            if (info.location.type === "chunk") {
                const chunk = info.location.chunk;
                dragChunk = true;

                info.shape.startDrag(evt);
                DD.getDragElement(info.shape).followPointer = false;

                dragOffset = chunk.group.getRelativePointerPosition();

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
        });

        info.shape.on('dragstart', (evt) => {
            console.log("dragstart", info);
            document.body.style.cursor = "grabbing";

            if (dragChunk) {
                return;
            }

            if (asModule(info.card).type === ModuleType.MainModule) {
                info.shape.fire('pointerhold', evt);
                return;
            }

            if (info.location.type === "chunk") {
                DD.getDragElement(info.shape).followPointer = false;

                if (info.shape.getScene() === this.spaceshipsScene) {
                    const position = info.shape.getAbsolutePosition();

                    // move to hand scene
                    ignoreDragend = true;
                    info.shape.remove();
                    info.shape.setAttrs({
                        scaleX: this.spaceshipsScene.scaleX(),
                        scaleY: this.spaceshipsScene.scaleY(),

                        x: position.x,
                        y: position.y
                    });
                    this.handScene.add(info.shape);
                    info.shape.startDrag(evt);

                    // startDrag will fire dragstart event again, this time the card will be in the hand scene

                    return;
                }
            } else if (info.location.type === "hand") {
                info.location = {type: "dragHand"};
                console.log("hand -> dragHand")

                const position = info.shape.getAbsolutePosition();

                // replace card with placeholder in hand
                this.handManager.replaceCardWithPlaceholder(info);

                ignoreDragend = true;
                info.shape.remove();
                info.shape.setAttrs({
                    x: position.x,
                    y: position.y
                });
                this.handScene.add(info.shape);
                info.shape.startDrag(evt);

                return;
            }

            info.shape.moveToTop();
            dragOffset = info.shape.getRelativePointerPosition();
        });

        info.shape.on('dragmove', (evt) => {
            // const dragElement = DD.getDragElement(info.shape);
            // const pointerPosition = this.spaceshipsScene.getGraphics().getPointerById(dragElement.pointerId);

            assert.ok(info.location.type !== "hand");

            if (dragChunk) {
                const pointerPosition = this.spaceshipsScene.getRelativePointerPosition();
                assert.ok(info.location.type === "chunk");

                if (currentConnectionPoints.length !== 0) {
                    // try to disconnect from chunks if distance is too big
                    const dragPosition: Vector2 = {
                        x: pointerPosition.x - dragOffset.x,
                        y: pointerPosition.y - dragOffset.y,
                    };

                    const actualPosition = info.location.chunk.group.getPosition();

                    if (getDistance(dragPosition, actualPosition) >= this.connectDistance) {
                        for (const cp of currentConnectionPoints) {
                            const isMainChunk = this.hasMainModule(cp.chunk);

                            // TODO: obvious repetition here
                            // TODO: iterate over this.cards
                            for (const module of this.getChunkModules(cp.chunk)) {
                                const info = this.cards.find(c => CardGetters.id(c.card) === module.id)!;
                                info.shape.setState(isMainChunk ? 'DEFAULT' : 'DISABLED');
                            }
                        }

                        const isMainChunk = this.hasMainModule(info.location.chunk);
                        for (const module of this.getChunkModules(info.location.chunk)) {
                            const info = this.cards.find(c => CardGetters.id(c.card) === module.id)!;
                            info.shape.setState(isMainChunk ? 'DEFAULT' : 'DISABLED');
                        }

                        currentConnectionPoints = [];
                    }
                }

                if (currentConnectionPoints.length === 0) {
                    // follow pointer
                    info.location.chunk.group.setPosition({
                        x: pointerPosition.x - dragOffset.x,
                        y: pointerPosition.y - dragOffset.y,
                    });

                    if (info.location.chunk.owner !== this.thisPlayer) {
                        return;
                    }

                    // try to connect to chunks
                    const connectionPoints = this.getConnectionPoints(this.getChunkSpaceship(info.location.chunk));

                    if (connectionPoints.length >= 1) {
                        // update positions
                        info.location.chunk.group.setPosition({
                            x: connectionPoints[0].chunk.group.x() - connectionPoints[0].offset.x * this.cardSize,
                            y: connectionPoints[0].chunk.group.y() - connectionPoints[0].offset.y * this.cardSize
                        });

                        for (let i = 1; i < connectionPoints.length; ++i) {
                            connectionPoints[i].chunk.group.setPosition({
                                x: connectionPoints[0].chunk.group.x() + (connectionPoints[i].offset.x - connectionPoints[0].offset.x) * this.cardSize,
                                y: connectionPoints[0].chunk.group.y() + (connectionPoints[i].offset.y - connectionPoints[0].offset.y) * this.cardSize
                            });
                        }

                        // update disabled state
                        const modules = [
                            ...this.getChunkModules(info.location.chunk),
                            ...connectionPoints.flatMap(p => this.getChunkModules(p.chunk))
                        ];

                        const isMainChunk = modules.find(m => m.type === ModuleType.MainModule) !== undefined;

                        for (const module of modules) {
                            const info = this.cards.find(c => CardGetters.id(c.card) === module.id)!;

                            info.shape.setState(isMainChunk ? 'DEFAULT' : 'DISABLED');
                        }

                        currentConnectionPoints = connectionPoints;
                    }
                }

                return;
            }

            assert.ok(info.shape.getScene() === this.handScene);

            // console.log("dragmove", info);

            if (info.location.type === "drag") {
                // drag -> chunk
                // choose first viable connection (not the closest)
                const autorotatePoint = this.chunks
                    .filter(c => c.owner === this.thisPlayer)
                    .map(c => {
                        const p = this.getClosestModulePosition(c, info.shape.getAbsolutePosition());
                        const rotation = this.getFeasibleModuleRotation(
                            this.getChunkSpaceship(c),
                            asModule(info.card),
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
                    module.rotation = autorotatePoint.rotation;
                    info.shape.rotateCard(autorotatePoint.rotation * Math.PI / 2, 100);
                }

                const connected = this.tryConnectToChunk(info);

                // drag -> handDrag
                if (!connected) {
                    const placeholderPosition = this.handManager.getPlaceholderPosition();

                    if (placeholderPosition !== undefined) {
                        console.log("drag -> dragHand");

                        this.handManager.addPlaceholder(placeholderPosition);
                        info.location = {type: "dragHand"};

                        this.changeScale(info, 1);
                    }
                }
            } else if (info.location.type === "chunk") {
                // chunk -> drag
                // measure pointer distance from current location
                // disconnect if it is too big

                if (this.getChunkModules(info.location.chunk).length === 1) {
                    this.removeFromChunk(info);
                } else {
                    const pointerPosition = info.location.chunk.group.getRelativePointerPosition();
                    const relativePosition = {
                        x: (pointerPosition.x - dragOffset.x) / this.cardSize,
                        y: (pointerPosition.y - dragOffset.y) / this.cardSize
                    };

                    const distance = getDistance(relativePosition, ModuleGetters.position(module));

                    if (distance >= this.connectDistance) {
                        this.removeFromChunk(info);
                    }
                }
            } else if (info.location.type === "dragHand") {
                // dragHand -> drag
                // measure distance to hand, if the card is too far
                // remove placeholder from hand

                const position = this.handManager.getPlaceholderPosition();

                if (position !== undefined) {
                    this.handManager.setPlaceholderPosition(position);
                } else {
                    console.log("dragHand -> drag");

                    info.location = {type: "drag"};

                    this.handManager.removePlaceholder();
                    this.changeScale(info, this.spaceshipsScene.scaleX());
                }
            }
        });

        info.shape.on('dragend', () => {
            console.log("dragend", info);
            document.body.style.cursor = "default";

            if (ignoreDragend) {
                ignoreDragend = false;
                return;
            }

            if (dragChunk) {
                assert.ok(info.location.type === "chunk");

                const chunk = info.location.chunk;
                chunk.outline.forEach(l => l.destroy());
                chunk.outline = [];

                if (currentConnectionPoints.length > 0) {
                    this.mergeChunks(info.location.chunk, currentConnectionPoints);
                }

                dragChunk = false;
                return;
            }

            if (info.location.type === "drag") {
                const position = this.spaceshipsScene.getAbsoluteTransform().invert().point(
                    info.shape.getAbsolutePosition()
                );

                // create new chunk
                const chunk: Chunk = {
                    owner: this.thisPlayer,
                    activatedProtector: undefined,
                    group: this.spaceshipsScene.createAndAdd.group({
                        x: position.x,
                        y: position.y
                    }),
                    outline: []
                };
                this.chunks.push(chunk);

                this.addToChunk(info, chunk, {x: 0, y: 0});
            }

            if (info.location.type === "chunk") {
                // move to spaceships scene
                info.shape.remove();
                info.shape.setAttrs({
                    x: module.x * this.cardSize,
                    y: module.y * this.cardSize,

                    scaleX: 1,
                    scaleY: 1
                });
                info.location.chunk.group.add(info.shape);
            } else if (info.location.type === "dragHand") {
                this.handManager.replacePlaceholderWithCard(info);
                info.location = {type: "hand"};
            }

            // TODO
        });
    }

    private getConnectionPoints(spaceship: Spaceship): ConnectionPoint[] {
        let primaryConnectionPoint: ConnectionPoint | undefined = undefined;

        const thisPlayerChunks = this.chunks.filter(c => c.owner === this.thisPlayer);

        for (const chunk of thisPlayerChunks) {
            for (const module of spaceship.modules) {
                const modulePosition = this.cards.find(c => CardGetters.id(c.card) === module.id)!.shape.getAbsolutePosition()

                const closestModuleInfo = this.getClosestModulePosition(chunk, modulePosition);

                if (closestModuleInfo.distance < this.connectDistance) {
                    const newConnectionPoint = {
                        chunk,
                        offset: {
                            x: module.x - closestModuleInfo.position.x,
                            y: module.y - closestModuleInfo.position.y
                        },
                        spaceship: this.getChunkSpaceship(chunk)
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

        for (const chunk of thisPlayerChunks) {
            if (chunk === primaryConnectionPoint.chunk) {
                continue;
            }

            for (const module of spaceship.modules) {
                const modulePosition = primaryConnectionPoint.chunk.group.getAbsoluteTransform().point({
                    x: (module.x - primaryConnectionPoint.offset.x) * this.cardSize,
                    y: (module.y - primaryConnectionPoint.offset.y) * this.cardSize,
                });

                const closestModuleInfo = this.getClosestModulePosition(chunk, modulePosition);

                if (closestModuleInfo.distance < this.closeConnectDistance) {
                    const newConnectionPoint = {
                        chunk,
                        offset: {
                            x: module.x - closestModuleInfo.position.x,
                            y: module.y - closestModuleInfo.position.y
                        },
                        spaceship: this.getChunkSpaceship(chunk)
                    };

                    const mergedSpaceship = mergeSpaceships(
                        {spaceship, offset: {x: 0, y: 0}}, ...connectionPoints, newConnectionPoint
                    );

                    const hasBadConnections = mergedSpaceship.modules.some(m => !SpaceshipGetters.canConnectModule(mergedSpaceship, m));
                    if (hasBadConnections) {
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

    // returns true if module was connected to a chunk
    private tryConnectToChunk(info: CardInfo): boolean {
        const draggedModule = asModule(info.card);
        const connectionPoints = this.getConnectionPoints({modules: [draggedModule]});

        if (connectionPoints.length >= 1) {
            this.addToChunk(info, connectionPoints[0].chunk, {
                x: draggedModule.x - connectionPoints[0].offset.x,
                y: draggedModule.y - connectionPoints[0].offset.y
            });

            this.mergeChunks(
                connectionPoints[0].chunk,
                connectionPoints.slice(1).map(cp => {
                    cp.offset.x -= connectionPoints[0].offset.x;
                    cp.offset.y -= connectionPoints[0].offset.y;

                    return cp;
                })
            );
        }

        return false;
    }

    private mergeChunks(primaryChunk: Chunk, connectionPoints: ConnectionPoint[]) {
        if (connectionPoints.length === 0) {
            return;
        }

        const mergedSpaceship = mergeSpaceships(
            {spaceship: this.getChunkSpaceship(primaryChunk), offset: {x: 0, y: 0}},
            ...connectionPoints
        );
        const isMainChunk = SpaceshipGetters.getMainModule(mergedSpaceship) !== undefined;

        for (const module of this.getChunkModules(primaryChunk)) {
            const info = this.cards.find(c => CardGetters.id(c.card) === module.id)!;
            info.shape.setState(isMainChunk ? 'DEFAULT' : 'DISABLED');
        }

        for (const cp of connectionPoints) {
            // TODO: iterate over this.cards
            for (const module of this.getChunkModules(cp.chunk)) {
                // update spaceship
                const newPosition = ModuleGetters.position(mergedSpaceship.modules.find(m => m.id === module.id)!);

                module.x = newPosition.x;
                module.y = newPosition.y;

                // update shape
                const info = this.cards.find(c => CardGetters.id(c.card) === module.id)!;

                info.location = {type: "chunk", chunk: primaryChunk};

                info.shape.remove();
                info.shape.setAttrs({
                    x: module.x * this.cardSize,
                    y: module.y * this.cardSize
                });
                primaryChunk.group.add(info.shape);
                info.shape.setState(isMainChunk ? 'DEFAULT' : 'DISABLED');
            }
        }

        for (const connectionPoint of connectionPoints) {
            connectionPoint.chunk.group.destroy();
            this.chunks = this.chunks.filter(c => c !== connectionPoint.chunk);
        }
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

    private addToChunk(info: CardInfo, chunk: Chunk, position: Vector2) {
        assert.ok(info.location.type === "drag");

        const module = asModule(info.card);

        // update spaceship info
        module.x = position.x;
        module.y = position.y;

        // update shape
        info.shape.setPosition(chunk.group.getAbsoluteTransform().point({
            x: position.x * this.cardSize,
            y: position.y * this.cardSize
        }));

        info.shape.rotateCard(module.rotation * Math.PI / 2, 0);

        info.shape.setState(this.hasMainModule(chunk) ? 'DEFAULT' : 'DISABLED');

        const dragElement = DD.getDragElement(info.shape);
        if (dragElement) {
            dragElement.followPointer = false;
        }

        info.location = {type: "chunk", chunk};
        console.log("drag -> chunk");
    }

    private removeFromChunk(info: CardInfo) {
        assert.ok(info.location.type === "chunk");
        const chunk = info.location.chunk;

        info.location = {type: "drag"};

        info.shape.setState('DEFAULT');
        DD.getDragElement(info.shape).followPointer = true;

        const spaceship = this.getChunkSpaceship(chunk);

        if (spaceship.modules.length === 0) {
            this.chunks = this.chunks.filter(c => c !== chunk);
            chunk.group.destroy();
        } else {
            const components = SpaceshipGetters.getComponents(spaceship);

            console.log(components);

            for (let i = 0; i < components.length; ++i) {
                let componentChunk: Chunk;
                if (i == 0) {
                    componentChunk = chunk;
                } else {
                    componentChunk = {
                        owner: this.thisPlayer,
                        activatedProtector: undefined,
                        group: this.spaceshipsScene.createAndAdd.group({
                            x: chunk.group.x(),
                            y: chunk.group.y(),
                        }),
                        outline: []
                    };

                    this.chunks.push(componentChunk);
                }

                const isMainChunk = SpaceshipGetters.getMainModule(components[i]) !== undefined;

                for (const module of components[i].modules) {
                    const info = this.cards.find(c => CardGetters.id(c.card) === module.id)!;

                    info.location = {type: "chunk", chunk: componentChunk};

                    info.shape.remove();
                    componentChunk.group.add(info.shape);
                    info.shape.setState(isMainChunk ? 'DEFAULT' : 'DISABLED');
                }
            }
        }

        console.log("chunk -> drag");
    }

    private rotateInPlace(info: CardInfo) {
        const module = asModule(info.card);
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

    // changes card scale
    // also changes drag offset so that drag point doesn't change
    private changeScale(info: CardInfo, newScale: number) {
        // надо менять масштаб для pointer, используя info.shape.scale()
        const offset = DD.getDragElement(info.shape).offset;
        offset.x *= newScale / info.shape.scaleX();
        offset.y *= newScale / info.shape.scaleY();

        info.shape.setAttrs({
            scaleX: newScale,
            scaleY: newScale,
        });
    }

    resize() {
        this.handManager.resize();
    }
}