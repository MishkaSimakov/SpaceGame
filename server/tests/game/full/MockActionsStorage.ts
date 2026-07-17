import {ActionPurpose, ActionWithStorageInfo, IActionsStorage} from "@src/game/interfaces/IActionsStorage";
import {Action} from "@common/ActionsHelpers";

export class MockActionsStorage implements IActionsStorage {
    actions: ActionWithStorageInfo[] = [];

    appendAction(action: Action<string, any, any>, purpose: ActionPurpose, gameTime: number): void {
        this.actions.push({action, purpose, storedAtGameTime: gameTime});
    }

    getActionsWithStorageInfo(): ActionWithStorageInfo[] {
        return this.actions;
    }
}