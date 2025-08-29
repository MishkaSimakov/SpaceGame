import {StateGetters} from "@common/getters/State";
import {Action} from "@common/ActionsHelpers";
import {GameState} from "@common/Types";

import {Middleware} from "../ActionsBus";
import {getPlayerTime} from "../sagas/components/Time";
import {LossSignal} from "./LossSignal";

export class LossMiddleware extends Middleware {
    constructor(
        private readonly stateRef: GameState,
    ) {
        super();
    }

    apply(action: Action<string, any, any>): Action<string, any, any> | undefined {
        const currentPlayer = StateGetters.currentPlayer(this.stateRef);

        if (currentPlayer.lose || this.stateRef.players.filter(p => !p.lose).length === 1) {
            throw new LossSignal();
        }

        if (this.stateRef.settings.timeControlSettings?.loseWhenTimeout) {
            const time = getPlayerTime(this.stateRef, currentPlayer.id, action.time);

            if (time < 0) {
                throw new LossSignal();
            }
        }

        return action;
    }
}