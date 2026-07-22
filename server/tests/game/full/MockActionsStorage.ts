import {ActionPurpose, ActionWithStorageInfo, IActionsStorage} from "@src/game/interfaces/IActionsStorage";
import {Action} from "@common/ActionsHelpers";

type AppendListener = (action: Action<string, any, any>, purpose: ActionPurpose, gameTime: number) => void;

export class MockActionsStorage implements IActionsStorage {
    actions: ActionWithStorageInfo[] = [];

    private appendListeners: AppendListener[] = [];

    // An append listener that throws models a storage backend that has become unwritable.
    addAppendListener(listener: AppendListener) {
        this.appendListeners.push(listener);
    }

    appendAction(action: Action<string, any, any>, purpose: ActionPurpose, gameTime: number): void {
        for (const listener of this.appendListeners) {
            listener(action, purpose, gameTime);
        }

        this.actions.push({action, purpose, storedAtGameTime: gameTime});
    }

    getActionsWithStorageInfo(): ActionWithStorageInfo[] {
        return this.actions;
    }
}