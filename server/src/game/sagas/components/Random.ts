import {DiceResult} from "@common/actions/Random";
import {all, put, take} from "../Effects";

import Actions from "@common/actions/Main"
import Player from "@common/Player";

const {shuffle, throwDice} = Actions;

export function* dice(player: Player): Generator<any, DiceResult, any> {
    const {res} = yield* all({
        req: put(throwDice(player)),
        res: take('throwDiceResult')
    });

    return res.payload;
}

export function* shuffleArray<T>(array: T[]) {
    const {res} = yield* all({
        req: put(shuffle(array.length)),
        res: take('shuffleResult')
    });

    const shuffled = res.payload.map(i => array[i]);
    array.splice(0, array.length, ...shuffled);
}