import {action} from "./ActionConstructors";

export default {
    ...action('time', () => ({payload: {}})),
    ...action('timeResult', (result: number) => ({payload: result}))
};