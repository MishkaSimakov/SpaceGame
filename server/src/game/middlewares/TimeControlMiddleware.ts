import {Action} from "@common/ActionsHelpers";
import {GameState} from "@common/Types";

import {IMiddleware} from "../ActionsBus";
import {getPlayerTime, getTimeDecreasingPlayerId} from "../sagas/components/Time";
import {LossSignal} from "./LossSignal";
import {Observable} from "@common/Observable";
import {playerLost} from "@common/Actions";
import {IClock} from "@src/game/interfaces/IClock";

export class TimeControlMiddleware implements IMiddleware {
    constructor(
        private readonly stateRef: GameState,
        private readonly clock: IClock,
        private readonly throwHandle: Observable<any>
    ) {
    }

    apply(action: Action<string, any, any>): Action<string, any, any> | undefined {
        if (
            !this.stateRef.settings.timeControlSettings?.loseWhenTimeout
            || action.type === 'addTimeRecord'
            || action.type === 'time'
            || action.type === 'timeResult'
            || action.type === 'sendPlayerLostInfo'
            || action.type === 'reducerUpdatedState'
        ) {
            return action;
        }

        // protect game state against changes
        const state = structuredClone(this.stateRef);

        const timeDecreasingPlayerId = getTimeDecreasingPlayerId(state);
        if (timeDecreasingPlayerId === undefined) {
            return action;
        }

        const time = getPlayerTime(state, timeDecreasingPlayerId, this.clock.getTime());

        if (time < 0) {
            return playerLost(timeDecreasingPlayerId);
        }

        return action;
    }
}