import {action} from "./ActionConstructors";
import Player from "../Player";

export type DiceResult = 1 | 2 | 3 | 4 | 5 | 6;

export default {
    ...action('throwDice', (player: Player) => ({payload: {player: player.id}})),
    ...action('throwDiceResult', (result: DiceResult) => ({payload: result})),

    ...action('shuffle', (length: number) => ({payload: {length}})),
    ...action('shuffleResult', (order: number[]) => ({payload: order}))
};