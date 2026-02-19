import {GameState} from "@common/Types";

import {Channel} from "@src/game/sagas/runner/Channel";
import {Action} from "@common/ActionsHelpers";

export type Environment = {
    state: GameState

    output: Channel<Action>

    input: Channel<Action>
}