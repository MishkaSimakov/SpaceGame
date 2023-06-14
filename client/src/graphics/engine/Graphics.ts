import Scene from "./Scene";
import {Container} from "./Container";
import {Node, NodeConfig} from "./Node";
import {GetSet, Vector2} from "./types";
import {Factory} from "./Factory";
import {Utils} from "./Utils";
import {Shape} from "./Shape";
import {DD} from "./Drag";
import {_registerNode} from "./Global";

type GraphicsManagerEvents = 'pointerdown' | 'pointerup' | 'pointermove' | 'ready';

export interface GraphicsConfig extends NodeConfig {
    container: HTMLDivElement | string;
}

const STRING = 'string',
    PX = 'px',
    MOUSEOUT = 'mouseout',
    MOUSELEAVE = 'mouseleave',
    MOUSEOVER = 'mouseover',
    MOUSEENTER = 'mouseenter',
    MOUSEMOVE = 'mousemove',
    MOUSEDOWN = 'mousedown',
    MOUSEUP = 'mouseup',
    POINTERMOVE = 'pointermove',
    POINTERDOWN = 'pointerdown',
    POINTERUP = 'pointerup',
    POINTERCANCEL = 'pointercancel',
    LOSTPOINTERCAPTURE = 'lostpointercapture',
    POINTEROUT = 'pointerout',
    POINTERLEAVE = 'pointerleave',
    POINTEROVER = 'pointerover',
    POINTERENTER = 'pointerenter',
    CONTEXTMENU = 'contextmenu',
    TOUCHSTART = 'touchstart',
    TOUCHEND = 'touchend',
    TOUCHMOVE = 'touchmove',
    TOUCHCANCEL = 'touchcancel',
    WHEEL = 'wheel',
    EVENTS = [
        [MOUSEENTER, '_pointerenter'],
        [MOUSEDOWN, '_pointerdown'],
        [MOUSEMOVE, '_pointermove'],
        [MOUSEUP, '_pointerup'],
        [MOUSELEAVE, '_pointerleave'],
        [TOUCHSTART, '_pointerdown'],
        [TOUCHMOVE, '_pointermove'],
        [TOUCHEND, '_pointerup'],
        [TOUCHCANCEL, '_pointercancel'],
        [MOUSEOVER, '_pointerover'],
        [WHEEL, '_wheel'],
        [CONTEXTMENU, '_contextmenu'],
        [POINTERDOWN, '_pointerdown'],
        [POINTERMOVE, '_pointermove'],
        [POINTERUP, '_pointerup'],
        [POINTERCANCEL, '_pointercancel'],
        [LOSTPOINTERCAPTURE, '_lostpointercapture'],
    ];

const EVENTS_MAP = {
    mouse: {
        [POINTEROUT]: MOUSEOUT,
        [POINTERLEAVE]: MOUSELEAVE,
        [POINTEROVER]: MOUSEOVER,
        [POINTERENTER]: MOUSEENTER,
        [POINTERMOVE]: MOUSEMOVE,
        [POINTERDOWN]: MOUSEDOWN,
        [POINTERUP]: MOUSEUP,
        [POINTERCANCEL]: 'mousecancel',
        pointerclick: 'click',
        pointerdblclick: 'dblclick',
    },
    touch: {
        [POINTEROUT]: 'touchout',
        [POINTERLEAVE]: 'touchleave',
        [POINTEROVER]: 'touchover',
        [POINTERENTER]: 'touchenter',
        [POINTERMOVE]: TOUCHMOVE,
        [POINTERDOWN]: TOUCHSTART,
        [POINTERUP]: TOUCHEND,
        [POINTERCANCEL]: TOUCHCANCEL,
        pointerclick: 'tap',
        pointerdblclick: 'dbltap',
    },
    pointer: {
        [POINTEROUT]: POINTEROUT,
        [POINTERLEAVE]: POINTERLEAVE,
        [POINTEROVER]: POINTEROVER,
        [POINTERENTER]: POINTERENTER,
        [POINTERMOVE]: POINTERMOVE,
        [POINTERDOWN]: POINTERDOWN,
        [POINTERUP]: POINTERUP,
        [POINTERCANCEL]: POINTERCANCEL,
        pointerclick: 'pointerclick',
        pointerdblclick: 'pointerdblclick',
    },
};

const getEventType = (type) => {
    if (type.indexOf('pointer') >= 0) {
        return 'pointer';
    }
    if (type.indexOf('touch') >= 0) {
        return 'touch';
    }
    return 'mouse';
};

const getEventsMap = (eventType: string) => {
    const type = getEventType(eventType);
    if (type === 'pointer') {
        return EVENTS_MAP.pointer;
    }
    if (type === 'touch') {
        return EVENTS_MAP.touch;
    }
    if (type === 'mouse') {
        return EVENTS_MAP.mouse;
    }
};

class Graphics extends Container<Scene> {
    content: HTMLDivElement;
    container: GetSet<HTMLDivElement, this>;
    pointerPos: Vector2;
    _pointerPositions: (Vector2 & { id?: number })[] = [];
    _changedPointerPositions: (Vector2 & { id: number })[] = [];

    _pointerClickStart: Shape;
    _mouseClickStart: Shape;
    _touchClickStart: Shape;

    _pointerTarget: Shape;
    _mouseTarget: Shape;
    _touchTarget: Shape;

    CLICK_TIMEOUT: number = 100;

    constructor(config: GraphicsConfig) {
        super(config);

        this.buildDOM();
        this.bindContentEvents();
    }

    private buildDOM() {
        let container = this.container();

        if (!container)
            throw 'There must be container in graphics';

        this.content = document.createElement('div');
        this.content.style.position = 'relative';
        this.content.style.userSelect = 'none';

        this.content.setAttribute('role', 'presentation');

        container.appendChild(this.content);
    }

    private bindContentEvents() {
        EVENTS.forEach(([event, methodName]) => {
            this.content.addEventListener(
                event,
                (evt) => {
                    if (Utils.isFunction(this[methodName]))
                        this[methodName](evt);
                },
                {passive: false}
            );
        });
    }

    getGraphics(): Graphics {
        return this;
    }

    setContainer(container: HTMLDivElement | string) {
        if (typeof container === 'string') {
            container = document.getElementById(container) as HTMLDivElement;

            if (!container)
                throw `Cannot find container`;
        }

        this.setAttr('container', container);
        if (this.content) {
            if (this.content.parentElement) {
                this.content.parentElement.removeChild(this.content);
            }

            container.appendChild(this.content);
        }

        return this;
    }

    add(scene: Scene) {
        super.add(scene);

        scene.setSize({width: this.width(), height: this.height()});
        scene.draw();

        this.content.appendChild(scene.canvas.canvas);

        return this;
    }

    getPointerById(id: number) {
        return this._pointerPositions.find(p => p.id === id);
    }

    updatePointerPosition(evt) {
        if (evt.touches !== undefined) {
            this._pointerPositions = [];
            this._changedPointerPositions = [];

            for (let touch of evt.touches) {
                this._pointerPositions.push({
                    id: touch.identifier,
                    x: touch.clientX,
                    y: touch.clientY
                });
            }

            for (let touch of (evt.changedTouches || evt.touches)) {
                this._changedPointerPositions.push({
                    id: touch.identifier,
                    x: touch.clientX,
                    y: touch.clientY
                });
            }
        } else {
            let x = evt.clientX;
            let y = evt.clientY;

            this.pointerPos = {
                x: x,
                y: y
            };
            this._pointerPositions = [{x, y, id: Utils.getFirstPointerId(evt)}];
            this._changedPointerPositions = [{x, y, id: Utils.getFirstPointerId(evt)}];
        }
    }

    _pointerdown(evt: TouchEvent | MouseEvent | PointerEvent) {
        const events = getEventsMap(evt.type);
        const eventType = getEventType(evt.type);

        if (!events)
            return;

        this.updatePointerPosition(evt);

        let triggeredOnShape = false;

        this._changedPointerPositions.forEach((pointer) => {
            let shape = this.getIntersection(pointer);

            Graphics['_' + eventType + 'ListenClick'] = true;

            if (!shape)
                return;

            shape.fire(events.pointerdown, {
                evt: evt,
                pointerId: pointer.id
            }, true);
            triggeredOnShape = true;

            this['_' + eventType + 'ClickStart'] = shape;
        });

        if (!triggeredOnShape) {
            this.fire(events.pointerdown, {
                evt: evt,
                target: this,
                currentTarget: this,
                pointerId: this._pointerPositions[0].id
            });
        }
    }

    _pointermove(evt: TouchEvent | MouseEvent | PointerEvent) {
        const events = getEventsMap(evt.type);
        const eventType = getEventType(evt.type);

        if (!events)
            return;

        this.updatePointerPosition(evt);

        if (DD.isDragging)
            return;

        let triggeredOnShape = false;

        let target = this['_' + eventType + 'Target'];
        this._changedPointerPositions.forEach((pointer) => {
            let currentTarget = this.getIntersection(pointer);

            let event = {
                evt: evt,
                pointerId: pointer.id
            };

            let targetChanged = currentTarget !== target;

            if (targetChanged && target) {
                target._fireAndBubble(events.pointerout, {...event}, currentTarget);
                target._fireAndBubble(events.pointerleave, {...event}, currentTarget);
            }

            if (currentTarget) {
                triggeredOnShape = true;

                if (targetChanged) {
                    currentTarget.fire(events.pointerover, {...event}, true);
                    currentTarget.fire(events.pointerenter, {...event}, true);

                    this['_' + eventType + 'Target'] = currentTarget;
                }
                currentTarget.fire(events.pointermove, {...event}, true);
            } else {
                if (target) {
                    this.fire(events.pointerover, {
                        evt: evt,
                        target: this,
                        currentTarget: this,
                        pointerId: pointer.id
                    });

                    this['_' + eventType + 'Target'] = undefined;
                }
            }
        });

        if (!triggeredOnShape) {
            this.fire(events.pointermove, {
                evt: evt,
                target: this,
                currentTarget: this,
                pointerId: this._pointerPositions[0].id
            });
        }
    }

    _pointerup(evt: TouchEvent | MouseEvent | PointerEvent) {
        const events = getEventsMap(evt.type);
        const eventType = getEventType(evt.type);

        if (!events)
            return;

        this.updatePointerPosition(evt);

        let triggeredOnShape = false;

        this._changedPointerPositions.forEach((pointer) => {
            let shape = this.getIntersection(pointer);

            if (!shape)
                return;

            shape.fire(events.pointerup, {
                evt: evt,
                pointerId: pointer.id
            }, true);
            triggeredOnShape = true;

            if (!Graphics['_' + eventType + 'ListenClick'])
                return;

            if (shape === this['_' + eventType + 'ClickStart']) {
                shape.fire(events.pointerclick, {
                    evt: evt,
                    pointerId: pointer.id
                }, true);
            }
        });

        this['_' + eventType + 'ClickStart'] = undefined;

        if (!triggeredOnShape) {
            this.fire(events.pointerup, {
                evt: evt,
                target: this,
                currentTarget: this,
                pointerId: this._pointerPositions[0].id
            });
        }
    }

    _wheel(evt) {
        this.updatePointerPosition(evt);

        let shape = this.getIntersection(this.getPointerPosition());

        if (shape) {
            shape.fire('wheel', {evt: evt});
        } else {
            this.fire('wheel', {
                evt: evt,
                target: this,
                currentTarget: this
            })
        }
    }

    getIntersection(pos: Vector2): Shape {
        if (!pos)
            return;

        let children = this.getChildren();

        for (let i = children.length - 1; i >= 0; i--) {
            const shape = children[i].getIntersection(pos);

            if (shape)
                return shape;
        }
    }

    getPointerPosition(): Vector2 {
        const pos = this._pointerPositions[0] || this._changedPointerPositions[0];

        return {
            x: pos.x,
            y: pos.y
        };
    }
}

Graphics.prototype.nodeType = 'Graphics';
_registerNode(Graphics);

Factory.addGetterSetter(Graphics, 'container');

export {GraphicsManagerEvents, Graphics};
