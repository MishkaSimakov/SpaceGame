import {IActionsStorage} from "@src/game/interfaces/IActionsStorage";
import {Action} from "@common/ActionsHelpers";

export class MockActionsStorage implements IActionsStorage {
    actions: Action<any, any>[] = [];

    appendAction(action: Action<any, any>): void {
        this.actions.push(action);
    }

    getAllActions(): Action<any, any>[] {
        return [];
    }
}