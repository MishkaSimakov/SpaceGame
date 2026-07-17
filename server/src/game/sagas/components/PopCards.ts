import {Card, CardType, EventCard, ModuleCard} from "@common/Types";
import {clearDiscard, popCardFromStack, pushCardsToStack} from "@common/Actions";

import {put, select} from "../runner/Effects";
import {shuffleArray} from "./Random";
import * as assert from "node:assert";

type CardFromType<T extends CardType> = T extends CardType.Module
    ? { cardType: "module", module: ModuleCard }
    : { cardType: "event", event: EventCard };

export function* popOneCard<T extends CardType>(type: T): Generator<any, CardFromType<T>> {
    // temporary check, while transition to new types
    assert.ok(type === CardType.Module || type === CardType.Event, "wrong card type passed into popOneCard or popCards");

    const state = yield* select();

    const typeAsString = type === CardType.Module ? "module" : "event";

    if (state.stack[typeAsString].length === 0) {
        const discards = type === CardType.Module
            ? state.discards.module.map<Card>(module => ({cardType: "module", module}))
            : state.discards.event.map<Card>(event => ({cardType: "event", event}));

        yield* shuffleArray(discards);
        yield* put(pushCardsToStack(discards));
        yield* put(clearDiscard(type));
    }

    const topCard = (yield* select()).stack[typeAsString].pop();
    yield* put(popCardFromStack(type));

    if (type === CardType.Module) {
        return {cardType: "module", module: topCard as ModuleCard} as CardFromType<T>;
    } else {
        return {cardType: "event", event: topCard as EventCard} as CardFromType<T>;
    }
}

export function* popCards<T extends CardType>(type: T, count: number): Generator<any, CardFromType<T>[], any> {
    const result: CardFromType<T>[] = [];

    for (let i = 0; i < count; ++i) {
        result.push((yield* popOneCard(type)) as CardFromType<T>);
    }

    return result;
}