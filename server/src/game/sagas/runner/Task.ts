import {SagaGenerator} from "./Effects";

export const TASK_CANCEL = "TASK_CANCEL";

export enum TaskStatus {
    RUNNING = "RUNNING",
    CANCELED = "CANCELED",
    ABORTED = "ABORTED",
    DONE = "DONE"
}

export type Task = {
    asPromise: () => Promise<any>
    cancel: () => void
    end: (result: any, isError: boolean) => void
    cont: (result: any, isError: boolean) => void

    // getters
    result: () => any
    error: () => any
    isCancelled: () => boolean
};