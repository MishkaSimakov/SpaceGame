import {GameState} from "@common/Types";
import {Channel} from "@src/game/sagas/runner/Channel";
import {Action} from "@common/ActionsHelpers";
import {AbortHandle} from "@src/game/sagas/runner/AbortHandle";

export type Environment = {
    state: GameState

    output: Channel<Action>
    input: Channel<Action>

    abortHandle?: AbortHandle
}