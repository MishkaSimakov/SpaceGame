import Module from "@common/modules/Module";
import {Event} from "@common/events/Event";
import Actions from "@common/actions/Main";

import {put, select} from "../Effects";
import {shuffleArray} from "./Random";
import {CardTypeFromName} from "@common/Types";

export function* popOneCard<T extends "module" | "event">(type: T): Generator<any, CardTypeFromName<T>, any> {
    let state = yield* select();

    let discards = state.discards[type];

    if (state.stack[type].length === 0) {
        if (type === "module") {
            yield* shuffleArray(discards as Module[]);
        } else {
            yield* shuffleArray(discards as Event[]);
        }

        yield* put(Actions.returnDiscardsToStack(type, discards));

        // update state after reduce
        state = yield* select();
    }

    const topCard = state.stack[type].pop() as CardTypeFromName<T>;
    yield* put(Actions.popCardFromHeap(type));

    return topCard;
}

export function* popCards<T extends "module" | "event">(type: T, count: number): Generator<any, CardTypeFromName<T>[], any> {
    const result: CardTypeFromName<T>[] = [];

    for (let i = 0; i < count; ++i) {
        result.push(yield* popOneCard(type));
    }

    return result;
}