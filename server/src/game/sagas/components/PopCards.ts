import {put, select, shuffle} from "../../Effects";
import Module from "@common/modules/Module";
import {Event} from "@common/events/Event";
import {popCardFromHeap, returnDiscardsToStack} from "@common/actions/Main";
import {StateGetters} from "@common/getters/State";

type NameToType<T> = T extends "module"
    ? Module
    : (T extends "event" ? Event : never);

export function* popOneCard<T extends "module" | "event">(type: T): Generator<any, NameToType<T>, any> {
    let state = yield* select();

    let discards = state.discards[type];

    if (state.stack[type].length === 0) {
        if (type === "module") {
            yield* shuffle(discards as Module[]);
        } else {
            yield* shuffle(discards as Event[]);
        }

        yield* put(returnDiscardsToStack(type, discards));

        // update state after reduce
        state = yield* select();
    }

    const topCard = state.stack[type].pop() as NameToType<T>;
    yield* put(popCardFromHeap(type));

    return topCard;
}

export function* popCards<T extends "module" | "event">(type: T, count: number): Generator<any, NameToType<T>[], any> {
    const result: NameToType<T>[] = [];

    for (let i = 0; i < count; ++i) {
        result.push(yield* popOneCard(type));
    }

    return result;
}