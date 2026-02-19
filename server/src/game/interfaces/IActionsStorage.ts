import {Action} from "@common/ActionsHelpers";

export enum ActionPurpose {
    SAGA_INPUT,
    SAGA_OUTPUT,
    LOG
}

export type ActionWithStorageInfo = {
    action: Action;
    purpose: ActionPurpose;

    storedAtGameTime: number;
};

export interface IActionsStorage {
    appendAction(action: Action<string, any, any>, purpose: ActionPurpose, gameTime: number): void;

    getActionsWithStorageInfo(): ActionWithStorageInfo[];
}