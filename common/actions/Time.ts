import {action} from "./ActionConstructors";

export default {
    ...action('time'),
    ...action('timeResult', (result: number) => ({payload: result}))
};