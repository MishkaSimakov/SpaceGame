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

    draggable?: boolean;
    dragDistance?: number;
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

    constructor(config?: Config) {
        this.setAttrs(config);
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

    setAttrs(config: any) {
        if (!config)
            return this;

        for (let key in config) {
            let setterName = 'set' + Utils.capitalize(key);

            if (Utils.isFunction(this[setterName])) {
                this[setterName](config[key]);
            } else {
                this.setAttr(key, config[key]);
            }
        }

        return this;
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

    abstract getClientRect(relativeTo?: Container<Node>): BoundingRect;

    getAbsoluteTransform(top?: Node): Transform {
        let tr = new Transform();

        if (top) {
            this.eachAncestorsReverse(ancestor => {
                tr.multiply(ancestor.getTransform())
            }, top);
        } else {
            if (this.parent) {
                this.parent.getAbsoluteTransform().copyInto(tr);
            }

            tr.multiply(this.getTransform());
        }

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
        let tr = new Transform();

        let x = this.x();
        let y = this.y();
        let width = this.width();
        let height = this.height();

        let originX = this.originX();
        let originY = this.originY();

        let scaleX = this.attrs.scaleX ?? 1;
        let scaleY = this.attrs.scaleY ?? 1;

        if (x !== 0 || y !== 0)
            tr.translate(x, y);

        if (width !== 0 && originX)
            tr.translate(-1 * width * originX, 0);

        if (height !== 0 && originY)
            tr.translate(0, -1 * height * originY);

        if (scaleX !== 1 || scaleY !== 1)
            tr.scale(scaleX, scaleY);

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
            this.off(evtStr as string, handler);

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

    move(x: number, y: number) {
        this.x(this.x() + x)
            .y(this.y() + y);
    }

    isDragging(): boolean {
        const element = DD._dragElements.get(this._id);
        return element && element.dragStatus === 'dragging';
    }

    setDraggable(draggable) {
        this.setAttr('draggable', draggable);

        this.off('mousedown.core');
        this.off('touchdown.core');

        if (draggable) {
            this.on('mousedown.core touchdown.core', (evt) => {
                // should check button
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

        element.dragStatus = 'stopped';

        DD._endDrag(evt);
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

    destroy() {
        let parent = this.getParent();

        if (parent && parent.children) {
            parent.children.splice(this.index, 1);
            this.parent.setChildrenIndices();

            this.parent = undefined;
        }
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
        this.x(pos.x).y(pos.y);

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

    setAbsolutePosition(pos: Vector2) {
        let translation = this.getAbsoluteTransform().getTranslation();

        this.setPosition({
            x: this.attrs.x + pos.x - translation.x,
            y: this.attrs.y + pos.y - translation.y
        });
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
            evt: evt && evt.evt
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
            dragStatus: 'ready',
            pointerId
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

    name: GetSet<string, this>;
    x: GetSet<number, this>;
    y: GetSet<number, this>;
    scaleX: GetSet<number, this>;
    scaleY: GetSet<number, this>;
    width: GetSet<number, this>;
    height: GetSet<number, this>;
    originX: GetSet<number, this>;
    originY: GetSet<number, this>;

    draggable: GetSet<boolean, this>;
    dragDistance: GetSet<number, this>;
}

Node.prototype.nodeType = 'Node';

Factory.addGetterSetter(Node, 'name', '');

Factory.addGetterSetter(Node, 'x', 0);
Factory.addGetterSetter(Node, 'y', 0);

Factory.addGetterSetter(Node, 'scaleX', 1);
Factory.addGetterSetter(Node, 'scaleY', 1);


Factory.addGetterSetter(Node, 'width', 0);
Factory.addGetterSetter(Node, 'height', 0);

Factory.addGetterSetter(Node, 'originX', 0);
Factory.addGetterSetter(Node, 'originY', 0);

Factory.addGetterSetter(Node, 'draggable', false);
Factory.addGetterSetter(Node, 'dragDistance', undefined);
