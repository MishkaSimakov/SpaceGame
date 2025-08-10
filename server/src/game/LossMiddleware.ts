import {Action} from "@common/actions/Action";
import {StateGetters} from "@common/getters/State";
import Actions from "@common/actions/Main"

import GameState from "./GameState";
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
        const currentPlayer = StateGetters.currentPlayer(this.stateRef);

        if (currentPlayer.lose) {
            this.sagaRunnerRef.cancel("playerTurn");
            return;
        }

        if (this.stateRef.settings.withTimeControl && this.stateRef.settings.loseWhenTimeout) {
            const time = getPlayerTime(this.stateRef, currentPlayer.id, action.time);
            console.log("current time:", time)
            console.log(this.stateRef.settings.timeControlSettings.startTime, currentPlayer.time);
            if (time < 0) {
                this.sagaRunnerRef.cancel("playerTurn");
                return Actions.playerLost(currentPlayer);
            }
        }

        return action;
    }
}