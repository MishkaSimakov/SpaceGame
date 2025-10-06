import {GameState} from "@common/Types";

import ActionsBus from "../../ActionsBus";
import {Channel} from "@src/game/sagas/runner/Channel";
import {Action} from "@common/ActionsHelpers";
import {DeactivateSignal, PlayerLostSignal} from "@src/game/sagas/runner/Signals";

export type GameInput = Channel<Action | PlayerLostSignal | DeactivateSignal>

export type Environment = {
    state: GameState

    // action bus is used only as output!
    output: ActionsBus,

    input: GameInput
}