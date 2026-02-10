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

function asModule(card: Card): ModuleCard {
    assert.ok(card.cardType === "module");

    return card.module;
}

// Merges parts into one spaceship. `position` field is the position of merger connection point.
// Ignores activatedProtector. Changes positions so that first part does not move.
function mergeSpaceships(merger: ModuleCard, parts: { chunk: Chunk, position: Vector2 }[]): Spaceship {
    assert.ok(parts.length >= 1);

    const result: ModuleCard[] = [];

    for (const part of parts) {
        for (const module of part.chunk.spaceship.modules) {
            const copy = structuredClone(module);
            copy.x += parts[0].position.x - part.position.x;
            copy.y += parts[0].position.y - part.position.y;

            result.push(copy);
        }
    }

    const mergerCopy = structuredClone(merger);
    mergerCopy.x = parts[0].position.x;
    mergerCopy.y = parts[0].position.y;

    result.push(mergerCopy);

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
    private readonly mergeConnectDistance = 0.1;
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
                    spaceship: {modules: []},
                    group: this.spaceshipsScene.createAndAdd.group(this.allocateSpaceshipPosition()),
                    outline: []
                };

                this.chunks.push(chunk);
            }

            chunk.spaceship.activatedProtector = structuredClone(player.spaceship.activatedProtector);

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
                    SpaceshipModifiers.removeModule(info.location.chunk.spaceship, module);
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

                SpaceshipModifiers.addModule(chunk.spaceship, module, module.x, module.y);
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

        let chunk = this.chunks.find(c =>
            c.owner === thisPlayer.id && SpaceshipGetters.getMainModule(c.spaceship) !== undefined
        );

        if (!chunk) {
            chunk = {
                owner: thisPlayer.id,
                spaceship: structuredClone(thisPlayer.spaceship),
                group: this.spaceshipsScene.createAndAdd.group(this.allocateSpaceshipPosition()),
                outline: []
            };

            this.chunks.push(chunk);
        } else {
            chunk.spaceship.activatedProtector = structuredClone(thisPlayer.spaceship.activatedProtector);
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

    getSpaceship(): Spaceship | undefined {
        return this.chunks.find(chunk =>
            chunk.owner === this.thisPlayer
            && SpaceshipGetters.getMainModule(chunk.spaceship) !== undefined
        )?.spaceship;
    }

    private attachCardEvents(info: CardInfo) {
        if (info.card.cardType === "event") {
            return;
        }

        if (asModule(info.card).type === ModuleType.MainModule) {
            this.attachMainModuleEvents(info);
        } else {
            this.attachSecondaryModuleEvents(info);
        }
    }

    private attachSecondaryModuleEvents(info: CardInfo) {
        info.shape.draggable(true).dragDistance(5);

        const module = asModule(info.card);
        let dragOffset: Vector2;

        // when card shape is moved between scenes, dragend even is fired
        // it must be ignored
        let ignoreDragend = false;

        let dragChunk = false;

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

                chunk.outline = getSpaceshipOutline(chunk.spaceship, 0.05).map(path =>
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

        info.shape.on('dragmove', () => {
            assert.ok(info.location.type !== "hand");

            if (dragChunk) {
                console.log(info);
                assert.ok(info.location.type === "chunk");

                const pointerPosition = this.spaceshipsScene.getRelativePointerPosition();
                info.location.chunk.group.setPosition({
                    x: pointerPosition.x - dragOffset.x,
                    y: pointerPosition.y - dragOffset.y,
                });

                return;
            }

            assert.ok(info.shape.getScene() === this.handScene);

            // console.log("dragmove", info);

            if (info.location.type === "drag") {
                // drag -> chunk
                const connected = this.tryConnectToChunk(info, dragOffset);

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
                const chunk = info.location.chunk;

                if (chunk.spaceship.modules.length === 1) {
                    this.removeFromChunk(info);
                } else {
                    const pointerPosition = chunk.group.getRelativePointerPosition();
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
                    spaceship: {modules: []},
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

    private attachMainModuleEvents(info: CardInfo) {
        assert.ok(info.card.cardType === "module" && info.card.module.type === ModuleType.MainModule);

        assert.ok(info.location.type === "chunk");
        const chunk = info.location.chunk;

        info.shape.draggable(true).dragDistance(5);

        info.shape.on('click', () => this.rotateInPlace(info));

        info.shape.on('dragstart', () => chunk.group.moveToTop());

        info.shape.on('dragmove', () => {
            // TODO: make this better?
            const newMainPosition = info.shape.getPosition();
            info.shape.setPosition({x: 0, y: 0});

            chunk.group.move(newMainPosition);
        });
    }

    // returns true if module was connected to a chunk
    private tryConnectToChunk(info: CardInfo, dragOffset: Vector2): boolean {
        const module = asModule(info.card);

        const connectionPoints: { chunk: Chunk, position: Vector2 }[] = [];

        for (const chunk of this.chunks) {
            if (chunk.owner !== this.thisPlayer) {
                continue;
            }

            let relativePosition: Vector2;

            if (connectionPoints.length === 0) {
                const pointerPosition = chunk.group.getRelativePointerPosition();
                relativePosition = {
                    x: (pointerPosition.x - dragOffset.x) / this.cardSize,
                    y: (pointerPosition.y - dragOffset.y) / this.cardSize
                };
            } else {
                relativePosition = {
                    x: connectionPoints[0].position.x + (connectionPoints[0].chunk.group.x() - chunk.group.x()) / this.cardSize,
                    y: connectionPoints[0].position.y + (connectionPoints[0].chunk.group.y() - chunk.group.y()) / this.cardSize,
                };
            }

            const closestModulePosition = {
                x: Math.round(relativePosition.x),
                y: Math.round(relativePosition.y)
            };

            const distance = getDistance(relativePosition, closestModulePosition);
            const viableRotation = this.tryConnectWithRotations(chunk.spaceship, module, closestModulePosition);

            if (viableRotation === undefined) {
                continue;
            }

            if (connectionPoints.length === 0) {
                if (distance < this.autorotateDistance) {
                    module.rotation = viableRotation;
                    info.shape.rotateCard(module.rotation * Math.PI / 2);
                }

                if (distance < this.connectDistance) {
                    connectionPoints.push({
                        chunk,
                        position: closestModulePosition
                    })
                }
            } else if (
                viableRotation === module.rotation
                && distance < this.mergeConnectDistance
                && SpaceshipGetters.checkConfiguration(mergeSpaceships(module, connectionPoints), false)
            ) {
                connectionPoints.push({chunk, position: closestModulePosition});
            }
        }

        if (connectionPoints.length >= 1) {
            const mergedSpaceship = mergeSpaceships(module, connectionPoints);
            const isMainChunk = SpaceshipGetters.getMainModule(mergedSpaceship) !== undefined;

            this.addToChunk(info, connectionPoints[0].chunk, connectionPoints[0].position);

            for (let i = 1; i < connectionPoints.length; ++i) {
                for (const module of connectionPoints[i].chunk.spaceship.modules) {
                    SpaceshipModifiers.addModule(
                        connectionPoints[0].chunk.spaceship,
                        module,
                        ModuleGetters.position(mergedSpaceship.modules.find(m => m.id === module.id)!)
                    );

                    const info = this.cards.find(c => CardGetters.id(c.card) === module.id)!;

                    info.location = {type: "chunk", chunk: connectionPoints[0].chunk};

                    info.shape.remove();
                    info.shape.setAttrs({
                        x: module.x * this.cardSize,
                        y: module.y * this.cardSize
                    });
                    connectionPoints[0].chunk.group.add(info.shape);
                    info.shape.setState(isMainChunk ? 'DEFAULT' : 'DISABLED');
                }

                connectionPoints[i].chunk.group.destroy();
                this.chunks = this.chunks.filter(c => c !== connectionPoints[i].chunk);
            }
        }

        return false;
    }

    // returns rotation if module can be connected and undefined otherwise
    private tryConnectWithRotations(spaceship: Spaceship, module: ModuleCard, position: Vector2): number | undefined {
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
        const mainChunk = this.chunks.find(chunk =>
            chunk.owner === id && SpaceshipGetters.getMainModule(chunk.spaceship) !== undefined
        );

        if (!mainChunk) {
            return undefined;
        }

        const mainModuleId = SpaceshipGetters.getMainModule(mainChunk.spaceship)!.id;
        const mainModulePosition = this.cards
            .find(c => CardGetters.id(c.card) === mainModuleId)!.shape.getPosition();

        const chunkPosition = mainChunk.group.getPosition();

        return {
            x: chunkPosition.x + mainModulePosition.x + this.cardSize / 2,
            y: chunkPosition.y + mainModulePosition.y + this.cardSize / 2,
        }
    }

    private addToChunk(info: CardInfo, chunk: Chunk, position: Vector2) {
        assert.ok(info.location.type === "drag");

        const module = asModule(info.card);

        // update spaceship info
        const isAdded = SpaceshipModifiers.addModule(chunk.spaceship, module, position.x, position.y);
        assert.ok(isAdded);

        // update shape
        info.shape.setPosition(chunk.group.getAbsoluteTransform().point({
            x: position.x * this.cardSize,
            y: position.y * this.cardSize
        }));

        if (SpaceshipGetters.getMainModule(chunk.spaceship) === undefined) {
            info.shape.setState('DISABLED');
        }

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
        const module = asModule(info.card)

        // update spaceship
        SpaceshipModifiers.removeModule(chunk.spaceship, module);

        if (chunk.spaceship.modules.length === 0) {
            this.chunks = this.chunks.filter(c => c !== chunk);
            chunk.group.destroy();
        } else {
            const components = SpaceshipGetters.getComponents(chunk.spaceship);

            for (let i = 0; i < components.length; ++i) {
                let componentChunk: Chunk;
                if (i == 0) {
                    componentChunk = chunk;
                    componentChunk.spaceship = components[i];
                } else {
                    componentChunk = {
                        owner: this.thisPlayer,
                        spaceship: components[i],
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

        // update shape
        info.shape.setState('DEFAULT');

        info.location = {type: "drag"};
        DD.getDragElement(info.shape).followPointer = true;

        console.log("chunk -> drag");
    }

    private rotateInPlace(info: CardInfo) {
        const module = asModule(info.card);
        const initRotation = module.rotation;

        if (info.location.type === "chunk") {
            const spaceship = info.location.chunk.spaceship;
            SpaceshipModifiers.removeModule(spaceship, module);

            const possibleRotations = SpaceshipGetters.getPossibleRotationsFor(spaceship, module, module.x, module.y);

            let index = possibleRotations.indexOf(initRotation);
            index = (index + 1) % possibleRotations.length;

            module.rotation = possibleRotations[index];
            info.shape.rotateCard(module.rotation * (Math.PI / 2));

            SpaceshipModifiers.addModule(spaceship, module, module.x, module.y);
        } else if (info.location.type === "hand") {
            module.rotation = (module.rotation + 1) % 4;
            info.shape.rotateCard(module.rotation * (Math.PI / 2));
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