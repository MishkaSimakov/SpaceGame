import {Player} from "@common/Types";
import {shuffle, throwDice} from "@common/Actions";

import {all, put, take} from "../Effects";

export type DiceResult = 1 | 2 | 3 | 4 | 5 | 6;

export function* dice(player: Player): Generator<any, DiceResult, any> {
    const {res} = yield* all({
        req: put(throwDice(player.id)),
        res: take('throwDiceResult')
    });

    return res.payload.result as DiceResult;
}

export function* shuffleArray<T>(array: T[]) {
    const {res} = yield* all({
        req: put(shuffle(array.length)),
        res: take('shuffleResult')
    });

    const shuffled = res.payload.order.map(i => array[i]);
    array.splice(0, array.length, ...shuffled);
}