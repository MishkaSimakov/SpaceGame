import {Utils} from "./Utils";
import {Container} from "./Container";
import {Factory} from "./Factory";
import {BoundingRect, GetSet, Vector2} from "./types";
import Scene from "./Scene";
import {Transform} from "./Transform";
import {Shape} from "./Shape";
import {Graphics} from "./Graphics";
import {DD} from "./Drag";
import {Draw} from "./Global";
import Color from "@common/helpers/Color";

const TRANSFORM = 'TRANSFORM',
    ABSOLUTE_TRANSFORM = 'ABSOLUTE_TRANSFORM',
    ALL_LISTENERS = 'ALL_LISTENERS',
    VISIBLE = 'VISIBLE',
    GRAPHICS = 'GRAPHICS',
    INTERACTIVE = 'INTERACTIVE';

export interface NodeConfig {
    [index: string]: any;

    name?: string;
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    width?: number;
    height?: number;
    originX?: number;
    originY?: number;
    rotation?: number;

    draggable?: boolean;
    dragDistance?: number;

    visible?: boolean,
    interactive?: boolean,

    brightness?: number,
}

type NodeEventMap = GlobalEventHandlersEventMap & {
    [index: string]: any;
}

export interface EventObject<EventType> {
    type: string;
    target: Shape | Scene;
    evt: EventType;
    currentTarget: Node;
    pointerId: number;
    child?: Node;
}

let idCounter = 0;

export type EventListener<This, EventType> = (
    this: This,
    ev: EventObject<EventType>
) => void;

export abstract class Node<Config extends NodeConfig = NodeConfig> {
    _id = idCounter++;
    index: number = 0;
    attrs: any = {};
    parent?: Container<Node>;
    className!: string;
    nodeType!: string;

    lastPos: Vector2;

    eventListeners: Record<string, Array<{ name: string, handler: Function }>> = {};

    inAnimation: boolean = false;
    shouldAbortAnimation: boolean = false;

    _batchingTransformChange: boolean = false;

    constructor(config?: Config) {
        this.setAttrs(config);
    }

    isInteractive(): boolean {
        const interactive = this.interactive();

        if (!interactive)
            return false;

        const parent = this.getParent();

        if (parent) {
            return parent.isInteractive();
        } else {
            return true;
        }
    }

    isVisible(): boolean {
        const visible = this.visible();

        if (!visible)
            return false;

        const parent = this.getParent();

        if (parent) {
            return parent.isVisible();
        } else {
            return true;
        }
    }

    shouldDrawHit() {
        if (!this.isInteractive()) {
            return false;
        }

        const scene = this.getScene();

        for (let [_, dragElement] of DD._dragElements) {
            if (dragElement.dragStatus === 'dragging' && dragElement.node.getScene() === scene) {
                return false;
            }
        }

        return true;
    }

    getProtoListeners(eventType) {
        const allListeners = {};
        let events = allListeners?.[eventType];

        if (events === undefined) {
            events = [];
            let obj = Object.getPrototypeOf(this);

            while (obj) {
                const listeners = obj.eventListeners?.[eventType] ?? [];
                events.push(...listeners);

                obj = Object.getPrototypeOf(obj);
            }

            allListeners[eventType] = events;
        }

        return events;
    }

    requestRedraw() {
        this.getScene()?.batchDraw();
    }

    getScene(): Scene {
        let parent = this.getParent();

        return parent ? parent.getScene() : undefined;
    }

    getClassName() {
        return this.className || this.nodeType;
    }

    getGraphics(): Graphics {
        let parent = this.getParent();

        return parent ? parent.getGraphics() : undefined;
    }

    getParent() {
        return this.parent;
    }

    hasChildren() {
        return false;
    }

    isMatch(selector) {
        // TODO: add all variants of selectors
        if (Utils.isFunction(selector))
            return selector(this);

        if (selector[0] === '.')
            return this.name() === selector.slice(1);

        return false;
    }

    setAttrs(config: any) {
        if (!config)
            return this;

        this.batchTransformChanges(() => {
            for (let key in config) {
                let setterName = 'set' + Utils.capitalize(key);

                if (Utils.isFunction(this[setterName])) {
                    this[setterName](config[key]);
                } else {
                    this.setAttr(key, config[key]);
                }
            }
        });

        return this;
    }

    batchTransformChanges(func) {
        this._batchingTransformChange = true;
        func();
        this._batchingTransformChange = false;
    }

    eachAncestorsReverse(func: (node: Node) => void, top?: Node) {
        let ancestors = [],
            parent = this.getParent();

        if (top && top._id === this._id)
            return;

        ancestors.unshift(this);

        while (parent && (!top || parent._id !== top._id)) {
            ancestors.unshift(parent);

            parent = parent.getParent();
        }

        for (let ancestor of ancestors) {
            func(ancestor);
        }
    }

    getRelativePointerPosition(pointerId?: number) {
        if (!this.getGraphics())
            return;

        let pos: Vector2;

        if (pointerId) {
            pos = this.getGraphics().getPointerById(pointerId);
        } else {
            pos = this.getGraphics().getPointerPosition()
        }

        if (!pos)
            return;

        let transform = this.getAbsoluteTransform().copy().invert();

        return transform.point(pos);
    }

    abstract getClientRect(relativeTo?: Container<Node>, ignoreStroke?: boolean): BoundingRect | undefined;

    getAbsoluteTransform(top?: Node): Transform {
        let tr = new Transform();

        this.eachAncestorsReverse(ancestor => {
            tr.multiply(ancestor.getTransform())
        }, top);

        return tr;
    }

    transformedRect(rect: BoundingRect, top: Node): BoundingRect {
        let points = [
            {x: rect.left, y: rect.top},
            {x: rect.right, y: rect.top},
            {x: rect.right, y: rect.bottom},
            {x: rect.left, y: rect.bottom},
        ];
        let minX: number, minY: number, maxX: number, maxY: number;
        let trans = this.getAbsoluteTransform(top);

        points.forEach(point => {
            var transformed = trans.point(point);
            if (minX === undefined) {
                minX = maxX = transformed.x;
                minY = maxY = transformed.y;
            }
            minX = Math.min(minX, transformed.x);
            minY = Math.min(minY, transformed.y);
            maxX = Math.max(maxX, transformed.x);
            maxY = Math.max(maxY, transformed.y);
        });

        let br = new BoundingRect();
        br.left = minX;
        br.top = minY;
        br.bottom = maxY;
        br.right = maxX;

        return br;
    }

    getTransform(): Transform {
        let tr: Transform = new Transform();
        tr.reset();

        let x = this.x();
        let y = this.y();
        let width = this.width();
        let height = this.height();

        let originX = this.originX();
        let originY = this.originY();

        let scaleX = this.attrs.scaleX ?? 1;
        let scaleY = this.attrs.scaleY ?? 1;

        let rotation = this.rotation();

        if (x !== 0 || y !== 0)
            tr.translate(x, y);

        if (width !== 0 && originX)
            tr.translate(-1 * width * originX, 0);

        if (height !== 0 && originY)
            tr.translate(0, -1 * height * originY);

        // move rotation position
        let s = Math.sin(rotation);
        let c = Math.cos(rotation);

        let dx = (width - width * c + height * s) / 2;
        let dy = (height - width * s - height * c) / 2;

        tr.translate(dx, dy);

        if (rotation !== 0)
            tr.rotate(rotation);


        if (scaleX !== 1 || scaleY !== 1)
            tr.scale(scaleX, scaleY);

        tr.dirty = false;

        return tr;
    }

    setAttr(key: string, value: any) {
        let oldValue = this.attrs[key];

        if (oldValue === value && !Utils.isObject(value))
            return;

        this.attrs[key] = value;

        this.fire(key + 'Change', {
            oldValue: oldValue,
            value: value
        });

        this.requestRedraw();
    }

    abstract drawScene();

    abstract drawHit();

    draw() {
        this.drawScene();
        this.drawHit();

        return this;
    }

    on<K extends keyof NodeEventMap>(evtStr: K, handler: EventListener<this, NodeEventMap[K]>) {
        let events = (evtStr as string).split(' ');

        for (let event of events) {
            let parts = event.split('.');
            let baseEvent = parts[0];
            let name = parts[1] || '';

            if (!this.eventListeners[baseEvent])
                this.eventListeners[baseEvent] = [];

            this.eventListeners[baseEvent].push({
                name: name,
                handler: handler
            });
        }

        return this;
    }

    once<K extends keyof NodeEventMap>(evtStr: K, handler: EventListener<this, NodeEventMap[K]>) {
        let newHandler = (...args) => {
            this.off(evtStr as string, newHandler);

            handler.call(this, ...args);
        };

        this.on(evtStr, newHandler);
    }

    _fireAndBubble(eventType: string, evt: any = {}, compareShape?) {
        let shouldStop = (eventType === 'mouseenter' || eventType === 'mouseleave') &&
            (compareShape && (this === compareShape || (this.isAncestorOf && this.isAncestorOf(compareShape))));

        if (shouldStop)
            return;

        this._fire(eventType, evt);

        if (this.parent) {
            this._fireAndBubble.call(this.parent, eventType, evt);
        }
    }

    _fire(eventType: string, evt: any = {}) {
        const protoListeners = this.getProtoListeners(eventType);

        if (protoListeners) {
            for (let listener of protoListeners) {
                listener.handler.call(this, evt);
            }
        }

        let listeners = this.eventListeners[eventType];
        if (listeners) {
            for (let listener of listeners) {
                listener.handler.call(this, evt);
            }
        }
    }

    fire(eventType: string, evt: any = {}, bubble?: boolean) {
        evt.target = evt.target || this;

        if (bubble) {
            this._fireAndBubble(eventType, evt);
        } else {
            this._fire(eventType, evt);
        }
    }

    off(evtStr?: string, callback?) {
        let events = (evtStr || '').split(' '),
            parts: string[], baseEvent: string, name: string, event: string;

        if (!evtStr) {
            for (let t in this.eventListeners) {
                this._off(t, callback);
            }
        }

        for (event of events) {
            parts = event.split('.');
            baseEvent = parts[0];
            name = parts[1];

            if (baseEvent) {
                this._off(baseEvent, name, callback);
            } else {
                for (let t in this.eventListeners) {
                    this._off(t, name, callback);
                }
            }
        }
    }

    move(offset: Vector2) {
        let x = this.x(),
            y = this.y();

        this.setPosition({
            x: x + offset.x,
            y: y + offset.y
        });
    }

    isDragging(): boolean {
        const element = DD._dragElements.get(this._id);
        return element && element.dragStatus === 'dragging';
    }

    setDraggable(draggable) {
        this.setAttr('draggable', draggable);

        this.off('mousedown.core');
        this.off('touchstart.core');

        if (draggable) {
            this.on('mousedown.core touchstart.core', (evt) => {
                evt.evt.preventDefault();

                // TODO: should check button
                if (this.isDragging())
                    return;

                let hasDraggingChild = false;
                DD._dragElements.forEach(element => {
                    if (this.isAncestorOf(element.node)) {
                        hasDraggingChild = true;
                    }
                });

                if (!hasDraggingChild) {
                    this.createDragElement(evt);
                }
            });
        } else {
            let graphics = this.getGraphics();

            if (!graphics)
                return;

            const element = DD._dragElements.get(this._id);
            const isReady = element && element.dragStatus === 'ready',
                isDragging = element && element.dragStatus === 'dragging';

            if (isDragging) {
                this.stopDrag();
            } else if (isReady) {
                DD._dragElements.delete(this._id);
            }
        }
    }

    stopDrag(evt?) {
        const element = DD._dragElements.get(this._id);

        if (element) {
            element.dragStatus = 'stopped';
        }

        DD._endDragBefore(evt)
        DD._endDragAfter(evt);
    }

    _off(type, name?, callback?) {
        let evtListeners = this.eventListeners[type];

        if (!evtListeners)
            return;

        for (let i = 0; i < evtListeners.length; ++i) {
            let {name: evtName, handler} = evtListeners[i];

            if ((evtName !== 'core' || name === 'core') && (!name || name === evtName) && (!callback || handler === callback)) {
                evtListeners.splice(i, 1);

                if (evtListeners.length === 0) {
                    delete this.eventListeners[type];
                    break;
                }

                i--;
            }
        }
    }

    remove(abortDrag: boolean = true) {
        this.abortAnimation();

        if (abortDrag) {
            if (this.isDragging()) {
                this.stopDrag();
            }

            DD._dragElements.delete(this._id);
        }

        let parent = this.getParent();

        if (parent && parent.children) {
            parent.children.splice(this.index, 1);
            this.parent.setChildrenIndices();

            this.parent = undefined;
        }
    }


    destroy() {
        this.remove();
    }

    moveTo(newContainer: Container) {
        if (this.getParent() !== newContainer) {
            this.remove(false);
            newContainer.add(this);
        }

        return this;
    }

    isAncestorOf(node: Node): boolean {
        return false;
    }

    moveToTop() {
        if (!this.parent)
            return false;

        let index = this.index,
            length = this.parent.getChildren().length;

        if (index !== length - 1) {
            this.parent.children.splice(index, 1);
            this.parent.children.push(this);

            this.parent.setChildrenIndices();

            return true;
        }

        return false;
    }

    setPosition(pos: Vector2) {
        this.batchTransformChanges(() => {
            this.x(pos.x).y(pos.y);
        });

        return this;
    }

    getPosition(): Vector2 {
        return {
            x: this.x(),
            y: this.y()
        };
    }

    getAbsolutePosition(): Vector2 {
        return this.getAbsoluteTransform().getTranslation();
    }

    clearTransform() {
        let origTransform = {
            x: this.x(),
            y: this.y(),
            scaleX: this.scaleX(),
            scaleY: this.scaleY(),
            rotation: this.rotation()
        }

        this.attrs.x = 0;
        this.attrs.y = 0;
        this.attrs.scaleX = 1;
        this.attrs.scaleY = 1;
        this.attrs.rotation = 0;

        return origTransform;
    }

    setAbsolutePosition(pos: Vector2) {
        let origTransform = this.clearTransform();

        this.attrs.x = origTransform.x;
        this.attrs.y = origTransform.y;

        let tr = this.getAbsoluteTransform().copy();

        tr.invert();
        tr.translate(pos.x, pos.y);

        let newPos = {
            x: this.attrs.x + tr.getTranslation().x,
            y: this.attrs.y + tr.getTranslation().y
        };

        this.attrs.scaleX = origTransform.scaleX;
        this.attrs.scaleY = origTransform.scaleY;

        this.attrs.rotation = origTransform.rotation;

        this.setPosition(newPos);

        return this;
    }

    startDrag(evt?, bubbleEvent = true) {
        if (!DD._dragElements.has(this._id)) {
            this.createDragElement(evt);
        }

        const element = DD._dragElements.get(this._id);
        element.dragStatus = 'dragging';

        this.fire('dragstart', {
            type: 'dragstart',
            target: this,
            evt: evt && evt.evt,
            pointerId: element.pointerId,
        }, bubbleEvent);
    }

    createDragElement(evt) {
        let pointerId = evt?.pointerId;
        let graphics = this.getGraphics();
        let ap = this.getAbsolutePosition();
        let pos = graphics.getPointerById(pointerId) ||
            graphics._changedPointerPositions[0] ||
            ap;

        DD._dragElements.set(this._id, {
            node: this,
            startPointerPos: pos,
            startPos: this.getPosition(),
            offset: {
                x: pos.x - ap.x,
                y: pos.y - ap.y
            },
            followPointer: true,
            dragStatus: 'ready',
            pointerId,
        });
    }

    getDragDistance(): number {
        if (this.attrs.dragDistance !== undefined) {
            return this.attrs.dragDistance;
        } else if (this.parent) {
            return this.parent.getDragDistance();
        } else {
            return Draw.DRAG_DISTANCE;
        }
    }

    setDragPosition(evt, element) {
        const pos = this.getGraphics().getPointerById(element.pointerId);

        if (!pos)
            return;

        let newNodePosition = {
            x: pos.x - element.offset.x,
            y: pos.y - element.offset.y
        };

        if (
            !this.lastPos || this.lastPos.x !== newNodePosition.x || this.lastPos.y !== newNodePosition.y
        ) {
            this.setAbsolutePosition(newNodePosition);
            this.requestRedraw();
        }

        this.lastPos = newNodePosition;
    }

    abortAnimation() {
        if (this.inAnimation) {
            this.shouldAbortAnimation = true;
        }
    }

    // TODO: abort ongoing animations when start a new one or remove node
    animate(newAttrs: object, duration: number, animationFunc?: (x: number) => number) {
        if (this.inAnimation)
            return;

        this.inAnimation = true;

        const animationAttrs = ['x', 'y', 'scaleX', 'scaleY', 'fill', 'stroke', 'rotation']
            .filter(attr => Object.keys(newAttrs).includes(attr));

        if (animationAttrs.length !== Object.keys(newAttrs).length) {
            throw "animate method does not support given attribute";
        }

        const animationStart = new Date().getTime();
        const startAttrs = {};

        for (let attr of animationAttrs) {
            startAttrs[attr] = this[attr]();
            newAttrs[attr] = newAttrs[attr] ?? startAttrs[attr];
        }

        const _animationFunction = animationFunc ?? ((x: number) => {
            return -(Math.cos(Math.PI * x) - 1) / 2;
        });

        const makeAnimationStep = () => {
            requestAnimationFrame(() => {
                if (this.shouldAbortAnimation) {
                    this.shouldAbortAnimation = false;
                    this.inAnimation = false;
                    return;
                }

                const currentTime = new Date().getTime();
                const shouldStop = (currentTime - animationStart) >= duration;

                const percent = shouldStop ? 1 : _animationFunction((currentTime - animationStart) / duration);

                const interpolateAttribute = (attr: string, percent: number) => {
                    if (attr === "fill" || attr === 'stroke') {
                        const startColor = Color.fromString(startAttrs[attr]);
                        const newColor = Color.fromString(newAttrs[attr]);

                        return Color.interpolate(startColor, newColor, percent).toString();
                    } else if (attr === "rotation") {
                        // choose the shortest arc for interpolation
                        const forwardArc = Math.abs(startAttrs[attr] - newAttrs[attr]);
                        const backwardArc = 2 * Math.PI - forwardArc;

                        if (forwardArc < backwardArc) {
                            return newAttrs[attr] * percent + startAttrs[attr] * (1 - percent)
                        } else {
                            return (
                                (newAttrs[attr] + 2 * Math.PI * Math.sign(startAttrs[attr] - newAttrs[attr])) * percent
                                + startAttrs[attr] * (1 - percent)
                            ) % (2 * Math.PI);
                        }
                    } else {
                        return newAttrs[attr] * percent + startAttrs[attr] * (1 - percent);
                    }
                }

                this.batchTransformChanges(() => {
                    for (const attr of animationAttrs) {
                        this[attr](interpolateAttribute(attr, percent));
                    }
                });

                this.getScene().waitingForDraw = false;
                this.getScene().draw();

                if (!shouldStop) {
                    makeAnimationStep();
                } else {
                    this.inAnimation = false;
                }
            });
        }

        makeAnimationStep();
    }

    getAccumulatedBrightness(): number {
        let brightness = 1;

        this.eachAncestorsReverse(ancestor => {
            brightness *= ancestor.brightness();
        });

        return brightness;
    }

    name: GetSet<string, this>;
    x: GetSet<number, this>;
    y: GetSet<number, this>;

    position: GetSet<Vector2, this>;
    absolutePosition: GetSet<Vector2, this>;

    scaleX: GetSet<number, this>;
    scaleY: GetSet<number, this>;
    width: GetSet<number, this>;
    height: GetSet<number, this>;
    originX: GetSet<number, this>;
    originY: GetSet<number, this>;
    rotation: GetSet<number, this>;

    draggable: GetSet<boolean, this>;
    dragDistance: GetSet<number, this>;

    visible: GetSet<boolean, this>
    interactive: GetSet<boolean, this>

    brightness: GetSet<number, this>
}

Node.prototype.nodeType = 'Node';

Node.prototype.eventListeners = {};

Factory.addGetterSetter(Node, 'name', '');

Factory.addGetterSetter(Node, 'x', 0);
Factory.addGetterSetter(Node, 'y', 0);

Factory.addGetterSetter(Node, 'scaleX', 1);
Factory.addGetterSetter(Node, 'scaleY', 1);


Factory.addGetterSetter(Node, 'width', 0);
Factory.addGetterSetter(Node, 'height', 0);

Factory.addGetterSetter(Node, 'originX', 0);
Factory.addGetterSetter(Node, 'originY', 0);

Factory.addGetterSetter(Node, 'rotation', 0);

Factory.addGetterSetter(Node, 'position');
Factory.addGetterSetter(Node, 'absolutePosition');

Factory.addGetterSetter(Node, 'draggable', false);
Factory.addGetterSetter(Node, 'dragDistance', undefined);

Factory.addGetterSetter(Node, 'visible', true);
Factory.addGetterSetter(Node, 'interactive', true);

Factory.addGetterSetter(Node, 'brightness', 1);
