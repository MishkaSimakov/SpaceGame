import {Player} from "@common/Types";
import {shuffle, throwDice} from "@common/Actions";

import {all, put, take} from "../runner/Effects";
import {takeType} from "@src/game/sagas/components/TakeSpecific";

export type DiceResult = 1 | 2 | 3 | 4 | 5 | 6;

export function* dice(player: Player): Generator<any, DiceResult, any> {
    const {res} = yield* all({
        req: put(throwDice(player.id)),
        res: takeType('throwDiceResult')
    });

    return res.payload.result as DiceResult;
}

export function* shuffleArray<T>(array: T[]) {
    const {res} = yield* all({
        req: put(shuffle(array.length)),
        res: takeType('shuffleResult')
    });

    const shuffled = res.payload.order.map(i => array[i]);
    array.splice(0, array.length, ...shuffled);
}