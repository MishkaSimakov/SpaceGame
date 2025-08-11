import Module from "./modules/Module";
import {Event} from "./events/Event";

function isObject(value: any): value is object {
    return value != null && typeof value === 'object';
}

function deepEqual<T extends object>(object1: T, object2: T, exclude: string[] = []): boolean {
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);

    if (keys1.length !== keys2.length) {
        return false;
    }

    for (const key of keys1) {
        if (exclude.indexOf(key) !== -1) {
            continue;
        }

        const val1 = object1[key as keyof T];
        const val2 = object2[key as keyof T];
        const areObjects = isObject(val1) && isObject(val2);
        if (
            (areObjects && !deepEqual(val1, val2, exclude)) ||
            (!areObjects && val1 !== val2)
        ) {
            return false;
        }
    }

    return true;
}

export function areCardSetsEqual(arr1: (Module | Event)[], arr2: (Module | Event)[]) {
    if (arr1.length !== arr2.length) {
        return false;
    }

    for (const idx_1 of arr1.keys()) {
        for (const idx_2 of arr2.keys()) {
            if (deepEqual(arr1[idx_1], arr2[idx_2], ['x', 'y', 'rotation', 'id'])) {
                arr2.splice(idx_2, 1);
                break;
            }
        }
    }

    return !arr2.length;
}
