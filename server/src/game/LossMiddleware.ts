import {Action} from "@common/actions/Action";
import GameState from "./GameState";
import {StateGetters} from "@common/getters/State";
import {playerLost} from "@common/actions/Reducer";
import {Middleware} from "./ActionsBus";
import {SagaRunner} from "./sagas/SagaRunner";

export class LossMiddleware extends Middleware {
    constructor(
        private readonly stateRef: GameState,
        private readonly sagaRunnerRef: SagaRunner
    ) {
        super();
    }

    apply(action: Action): Action | undefined {
        const currentPlayer = StateGetters.currentPlayer(this.stateRef);

        if (currentPlayer.lose) {
            this.sagaRunnerRef.cancel("playerTurn");
            return;
        }

        if (currentPlayer.time < 0) {
            this.sagaRunnerRef.cancel("playerTurn");
            return playerLost(currentPlayer);
        }

        return action;
    }
}