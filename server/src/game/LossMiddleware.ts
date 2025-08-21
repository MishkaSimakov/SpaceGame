import {StateGetters} from "@common/getters/State";
import {Action} from "@common/ActionsHelpers";
import {playerLost} from "@common/Actions";
import {GameState} from "@common/Types";

import {Middleware} from "./ActionsBus";
import {SagaRunner} from "./sagas/SagaRunner";
import {getPlayerTime} from "./sagas/components/Time";

export class LossMiddleware extends Middleware {
    constructor(
        private readonly stateRef: GameState,
        private readonly sagaRunnerRef: SagaRunner<void>
    ) {
        super();
    }

    apply(action: Action<string, any, any>): Action<string, any, any> | undefined {
        if (this.sagaRunnerRef.currentTask() != "playerTurn") {
            return action;
        }

        const currentPlayer = StateGetters.currentPlayer(this.stateRef);

        if (currentPlayer.lose || this.stateRef.players.filter(p => !p.lose).length === 1) {
            this.sagaRunnerRef.cancel("playerTurn");
            return;
        }

        if (this.stateRef.settings.timeControlSettings?.loseWhenTimeout) {
            const time = getPlayerTime(this.stateRef, currentPlayer.id, action.time);

            if (time < 0) {
                this.sagaRunnerRef.cancel("playerTurn");
                return playerLost(currentPlayer.id);
            }
        }

        return action;
    }
}