import {action} from "./ActionConstructors";

export type DiceResult = 1 | 2 | 3 | 4 | 5 | 6;

export default {
    ...action('throwDice', () => ({payload: {}})),
    ...action('throwDiceResult', (result: DiceResult) => ({payload: result})),

    ...action('shuffle', (length: number) => ({payload: {length}})),
    ...action('shuffleResult', (order: number[]) => ({payload: order}))
};