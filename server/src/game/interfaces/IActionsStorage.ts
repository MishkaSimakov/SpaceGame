import {Action} from "@common/ActionsHelpers";

export interface IActionsStorage {
    appendAction(action: Action<any, any>): void;

    getAllActions(): Action<any, any>[];
}