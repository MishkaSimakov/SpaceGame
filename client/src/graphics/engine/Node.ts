import {Utils} from "./Utils";
import {Container} from "./Container";
import {Factory} from "./Factory";
import {BoundingRect, GetSet, Vector2} from "./types";
import {EventListener, EventName, EventOf, NodeEventMap, ValidSelector} from "./Events";
import Scene from "./Scene";
import {Transform} from "./Transform";
import {Graphics} from "./Graphics";
import {DD} from "./Drag";
import {Draw} from "./Global";
import Color from "@common/helpers/Color";

export interface NodeConfig {
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

let idCounter = 0;

export abstract class Node<Config extends NodeConfig = NodeConfig> {
    _id = idCounter++;
    index: number = 0;
    attrs: any = {};
    parent?: Container<Node>;
    className!: string;
    nodeType!: string;

    lastPos: Vector2;

    eventListeners: {
        [Key in EventName<Config>]?: Array<{
            name: string,
            handler: EventListener<Node, NodeEventMap<Config>[Key]>
        }>
    } = {};

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

        for (const [, dragElement] of DD._dragElements) {
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
        const parent = this.getParent();

        return parent ? parent.getScene() : undefined;
    }

    getClassName() {
        return this.className || this.nodeType;
    }

    getGraphics(): Graphics {
        const parent = this.getParent();

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
            for (const key in config) {
                const setterName = 'set' + Utils.capitalize(key);

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
        const ancestors = [];
        let parent = this.getParent();

        if (top && top._id === this._id)
            return;

        ancestors.unshift(this);

        while (parent && (!top || parent._id !== top._id)) {
            ancestors.unshift(parent);

            parent = parent.getParent();
        }

        for (const ancestor of ancestors) {
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
            pos = this.getGraphics().getPointerPosition();
        }

        if (!pos)
            return;

        const transform = this.getAbsoluteTransform().copy().invert();

        return transform.point(pos);
    }

    abstract getClientRect(relativeTo?: Container<Node>, ignoreStroke?: boolean): BoundingRect | undefined;

    getAbsoluteTransform(top?: Node): Transform {
        const tr = new Transform();

        this.eachAncestorsReverse(ancestor => {
            tr.multiply(ancestor.getTransform());
        }, top);

        return tr;
    }

    transformedRect(rect: BoundingRect, top: Node): BoundingRect {
        const points = [
            {x: rect.left, y: rect.top},
            {x: rect.right, y: rect.top},
            {x: rect.right, y: rect.bottom},
            {x: rect.left, y: rect.bottom},
        ];
        let minX: number, minY: number, maxX: number, maxY: number;
        const trans = this.getAbsoluteTransform(top);

        points.forEach(point => {
            const transformed = trans.point(point);
            if (minX === undefined) {
                minX = maxX = transformed.x;
                minY = maxY = transformed.y;
            }
            minX = Math.min(minX, transformed.x);
            minY = Math.min(minY, transformed.y);
            maxX = Math.max(maxX, transformed.x);
            maxY = Math.max(maxY, transformed.y);
        });

        const br = new BoundingRect();
        br.left = minX;
        br.top = minY;
        br.bottom = maxY;
        br.right = maxX;

        return br;
    }

    getTransform(): Transform {
        const tr: Transform = new Transform();
        tr.reset();

        const x = this.x();
        const y = this.y();
        const width = this.width();
        const height = this.height();

        const originX = this.originX();
        const originY = this.originY();

        const scaleX = this.attrs.scaleX ?? 1;
        const scaleY = this.attrs.scaleY ?? 1;

        const rotation = this.rotation();

        if (x !== 0 || y !== 0)
            tr.translate(x, y);

        if (width !== 0 && originX)
            tr.translate(-1 * width * originX, 0);

        if (height !== 0 && originY)
            tr.translate(0, -1 * height * originY);

        // move rotation position
        const s = Math.sin(rotation);
        const c = Math.cos(rotation);

        const dx = (width - width * c + height * s) / 2;
        const dy = (height - width * s - height * c) / 2;

        tr.translate(dx, dy);

        if (rotation !== 0)
            tr.rotate(rotation);


        if (scaleX !== 1 || scaleY !== 1)
            tr.scale(scaleX, scaleY);

        tr.dirty = false;

        return tr;
    }

    setAttr(key: string, value: any) {
        const oldValue = this.attrs[key];

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

    on<Selector extends string>(
        evtStr: ValidSelector<Config, Selector>,
        handler: EventListener<this, EventOf<Config, Selector>>
    ) {
        const events = evtStr.split(' ');

        for (const event of events) {
            const parts = event.split('.');
            // the signature has already checked the selector, so its base names are event names
            const baseEvent = parts[0] as EventName<Config>;
            const name = parts[1] || '';

            if (!this.eventListeners[baseEvent])
                this.eventListeners[baseEvent] = [];

            this.eventListeners[baseEvent]!.push({
                name: name,
                handler: handler as EventListener<Node, never>
            });
        }

        return this;
    }

    once<Selector extends string>(
        evtStr: ValidSelector<Config, Selector>,
        handler: EventListener<this, EventOf<Config, Selector>>
    ) {
        const newHandler = ((event: EventOf<Config, Selector>) => {
            this.off(evtStr, newHandler);

            handler.call(this, event);
        }) as EventListener<this, EventOf<Config, Selector>>;

        return this.on(evtStr, newHandler);
    }

    _fireAndBubble(eventType: string, evt: any = {}, compareShape?) {
        const shouldStop = (eventType === 'mouseenter' || eventType === 'mouseleave') &&
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
            for (const listener of protoListeners) {
                listener.handler.call(this, evt);
            }
        }

        const listeners = this.eventListeners[eventType];
        if (listeners) {
            for (const listener of listeners) {
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
        if (!evtStr) {
            for (const t in this.eventListeners) {
                this._off(t, callback);
            }
        }

        for (const event of (evtStr || '').split(' ')) {
            const parts = event.split('.');
            const baseEvent = parts[0];
            const name = parts[1];

            if (baseEvent) {
                this._off(baseEvent, name, callback);
            } else {
                for (const t in this.eventListeners) {
                    this._off(t, name, callback);
                }
            }
        }
    }

    move(offset: Vector2) {
        const x = this.x(),
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
            const graphics = this.getGraphics();

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

        DD._endDragBefore(evt);
        DD._endDragAfter(evt);
    }

    _off(type, name?, callback?) {
        const evtListeners = this.eventListeners[type];

        if (!evtListeners)
            return;

        for (let i = 0; i < evtListeners.length; ++i) {
            const {name: evtName, handler} = evtListeners[i];

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

        const parent = this.getParent();

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

    isAncestorOf(_node: Node): boolean {
        return false;
    }

    moveToTop() {
        if (!this.parent)
            return false;

        const index = this.index,
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
        const origTransform = {
            x: this.x(),
            y: this.y(),
            scaleX: this.scaleX(),
            scaleY: this.scaleY(),
            rotation: this.rotation()
        };

        this.attrs.x = 0;
        this.attrs.y = 0;
        this.attrs.scaleX = 1;
        this.attrs.scaleY = 1;
        this.attrs.rotation = 0;

        return origTransform;
    }

    setAbsolutePosition(pos: Vector2) {
        const origTransform = this.clearTransform();

        this.attrs.x = origTransform.x;
        this.attrs.y = origTransform.y;

        const tr = this.getAbsoluteTransform().copy();

        tr.invert();
        tr.translate(pos.x, pos.y);

        const newPos = {
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
        const pointerId = evt?.pointerId;
        const graphics = this.getGraphics();
        const ap = this.getAbsolutePosition();
        const pos = graphics.getPointerById(pointerId) ||
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

        const newNodePosition = {
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

        for (const attr of animationAttrs) {
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
                            return newAttrs[attr] * percent + startAttrs[attr] * (1 - percent);
                        } else {
                            return (
                                (newAttrs[attr] + 2 * Math.PI * Math.sign(startAttrs[attr] - newAttrs[attr])) * percent
                                + startAttrs[attr] * (1 - percent)
                            ) % (2 * Math.PI);
                        }
                    } else {
                        return newAttrs[attr] * percent + startAttrs[attr] * (1 - percent);
                    }
                };

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
        };

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

    visible: GetSet<boolean, this>;
    interactive: GetSet<boolean, this>;

    brightness: GetSet<number, this>;
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
