export type DiceResult = 1 | 2 | 3 | 4 | 5 | 6;

export const throwDice = () => {
    return {type: 'throwDice'};
}

export const throwDiceResult = (result: DiceResult) => {
    return {
        type: 'throwDiceResult',
        payload: result
    };
}

export const shuffle = (length: number) => {
    return {
        type: 'shuffle',
        payload: {length}
    };
}

export const shuffleResult = (order: number[]) => {
    return {
        type: 'shuffleResult',
        payload: order
    };
}