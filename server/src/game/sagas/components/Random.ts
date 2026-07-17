import {Player} from "@common/Types";
import {shuffle, throwDice} from "@common/Actions";

import {put} from "../runner/Effects";
import {takeType} from "@src/game/sagas/components/TakeSpecific";

export type DiceResult = 1 | 2 | 3 | 4 | 5 | 6;

export function* dice(player: Player): Generator<any, DiceResult, any> {
    yield* put(throwDice(player.id));
    const res = yield* takeType('throwDiceResult');

    return res.payload.result as DiceResult;
}

export function* shuffleArray<T>(array: T[]) {
    yield* put(shuffle(array.length));
    const res = yield* takeType('shuffleResult');

    const shuffled = res.payload.order.map(i => array[i]);
    array.splice(0, array.length, ...shuffled);
}