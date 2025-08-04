export const time = () => {
    return {type: 'time'};
}

export const timeResult = (result: number) => {
    return {
        type: 'timeResult',
        payload: result
    };
}