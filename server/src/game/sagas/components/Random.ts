import {DiceResult, shuffle, shuffleResult, throwDice, throwDiceResult} from "@common/actions/Random";
import {all, put, take} from "../../Effects";

export function* dice(): Generator<any, DiceResult, any> {
    const {req, res} = yield* all({
        req: put(throwDice()),
        res: take(throwDiceResult)
    });

    return res.payload;
}

export function* shuffleArray<T>(array: T[]) {
    const {req, res} = yield* all({
        req: put(shuffle(array.length)),
        res: take(shuffleResult)
    });

    const shuffled = res.payload.map(i => array[i]);
    array.splice(0, array.length, ...shuffled);
}