import {Action, ActionStub} from "@common/actions/Action";
import GameState from "./GameState";
import {StateGetters} from "@common/getters/State";
import {playerLost} from "@common/actions/Reducer";
import {Middleware} from "./ActionsBus";
import {SagaRunner} from "./sagas/SagaRunner";
import {getPlayerTime} from "./sagas/components/Time";

export class LossMiddleware extends Middleware {
    constructor(
        private readonly stateRef: GameState,
        private readonly sagaRunnerRef: SagaRunner
    ) {
        super();
    }

    apply(action: Action): Action | ActionStub | undefined {
        const currentPlayer = StateGetters.currentPlayer(this.stateRef);

        if (currentPlayer.lose) {
            this.sagaRunnerRef.cancel("playerTurn");
            return;
        }

        const time = getPlayerTime(this.stateRef, currentPlayer.id, action.time);
        console.log("current time:", time)
        console.log(this.stateRef.settings.timeControlSettings.startTime, currentPlayer.time);
        if (time < 0) {
            this.sagaRunnerRef.cancel("playerTurn");
            return playerLost(currentPlayer);
        }

        return action;
    }
}