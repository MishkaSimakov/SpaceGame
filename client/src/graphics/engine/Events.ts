import type {Node} from "./Node";

// The engine does not forward DOM events; it re-fires its own, named after the device that produced
// them (Graphics.EVENTS_MAP): the same physical click arrives as `mousedown`, `touchstart` or
// `pointerdown` depending on what the browser dispatched. `tap`, `pointerclick` and `add` have no
// DOM counterpart at all.
type MouseEventName =
    | 'mousedown' | 'mouseup' | 'mousemove' | 'mouseover' | 'mouseout' | 'mouseenter' | 'mouseleave'
    | 'mousecancel' | 'click' | 'dblclick' | 'contextmenu';

type TouchEventName =
    | 'touchstart' | 'touchend' | 'touchmove' | 'touchcancel' | 'touchover' | 'touchout'
    | 'touchenter' | 'touchleave' | 'tap' | 'dbltap';

type PointerEventName =
    | 'pointerdown' | 'pointerup' | 'pointermove' | 'pointerover' | 'pointerout' | 'pointerenter'
    | 'pointerleave' | 'pointercancel' | 'pointerclick' | 'pointerdblclick' | 'lostpointercapture';

// A drag is driven by whichever device is dragging, so it carries whatever that device sent.
type DragEventSource = MouseEvent | TouchEvent | PointerEvent;

// What a handler is passed. Three shapes, because the engine fires three kinds of event.

// An input event. The DOM event is not the payload — it is nested in `evt`.
export interface EventObject<EventType> {
    type: string;
    target: Node;
    evt: EventType;
    currentTarget: Node;
    pointerId: number;
}

// Container.add: a child was attached to this node.
export interface AddEvent {
    target: Node;
    child: Node;
}

// Node.setAttr: one of the node's config attributes changed. Fired as `${attribute}Change`, so the
// names a node answers to depend on its Config — a Text has `textChange`, a plain Node does not.
export interface AttrChangeEvent {
    target: Node;
    oldValue: any;
    value: any;
}

export type NodeEventMap<Config> =
    & Record<MouseEventName, EventObject<MouseEvent>>
    & Record<TouchEventName, EventObject<TouchEvent>>
    & Record<PointerEventName, EventObject<PointerEvent>>
    & Record<'dragstart' | 'dragmove' | 'dragend', EventObject<DragEventSource>>
    & {
        wheel: EventObject<WheelEvent>;
        add: AddEvent;
    }
    & Record<`${Extract<keyof Config, string>}Change`, AttrChangeEvent>;

export type EventName<Config> = keyof NodeEventMap<Config> & string;

// `on` takes a selector, not a name: 'click', a namespaced 'click.card' (the namespace is a label
// for `off`), or a space-separated list of either. These strip it back to the names it registers.
type BaseOf<Selector extends string> = Selector extends `${infer Base}.${string}` ? Base : Selector;

type NamesIn<Selector extends string> = Selector extends `${infer Head} ${infer Rest}`
    ? BaseOf<Head> | NamesIn<Rest>
    : BaseOf<Selector>;

// Rejects a selector naming an event this node never fires; otherwise passes it through.
export type ValidSelector<Config, Selector extends string> =
    NamesIn<Selector> extends EventName<Config> ? Selector : never;

// A handler registered for a selector sees every event that selector registers for.
export type EventOf<Config, Selector extends string> =
    NodeEventMap<Config>[NamesIn<Selector> & EventName<Config>];

export type EventListener<This, Event> = (
    this: This,
    ev: Event
) => void;
